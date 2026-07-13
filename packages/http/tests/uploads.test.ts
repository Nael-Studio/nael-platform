import { afterEach, describe, expect, it } from 'bun:test';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Controller, Module } from '@nl-framework/core';
import {
  clearExceptionFilters,
  clearHttpGuards,
  clearHttpInterceptors,
  clearHttpRouteRegistrars,
  createHttpApplication,
  Post,
  UploadedFile,
  UploadedFiles,
  UploadedFileHandle,
  type HttpApplication,
  type StorageAdapterLike,
} from '../src/index';

const ORIGIN = 'http://uploads.local';

@Controller('/files')
class UploadController {
  @Post('/single')
  single(@UploadedFile('avatar') file: UploadedFileHandle) {
    return { filename: file.filename, size: file.size, type: file.mimeType };
  }

  @Post('/limited')
  limited(
    @UploadedFile('avatar', { maxSize: 8, mimeTypes: ['image/png'] }) file: UploadedFileHandle,
  ) {
    return { filename: file.filename };
  }

  @Post('/optional')
  optional(@UploadedFile('avatar', { required: false }) file?: UploadedFileHandle) {
    return { present: Boolean(file) };
  }

  @Post('/many')
  many(@UploadedFiles() files: UploadedFileHandle[]) {
    return { count: files.length, names: files.map((f) => f.filename) };
  }

  @Post('/saved')
  async saved(@UploadedFile('doc') file: UploadedFileHandle) {
    const path = join(tmpdir(), `nl-upload-${file.filename}`);
    const bytes = await file.saveTo(path);
    const roundTrip = await Bun.file(path).text();
    return { bytes, roundTrip };
  }
}

/** A storage adapter fake capturing whatever is streamed/uploaded to it. */
class CapturingAdapter implements StorageAdapterLike {
  streamed: { key: string; bytes: number } | null = null;
  buffered: { key: string; bytes: number } | null = null;

  async uploadStream(key: string, stream: ReadableStream<Uint8Array>) {
    let bytes = 0;
    for await (const chunk of stream as unknown as AsyncIterable<Uint8Array>) {
      bytes += chunk.byteLength;
    }
    this.streamed = { key, bytes };
    return { key };
  }

  async uploadObject(key: string, data: ArrayBuffer | Uint8Array) {
    this.buffered = { key, bytes: data.byteLength };
    return { key };
  }
}

@Module({ controllers: [UploadController] })
class UploadModule {}

describe('HTTP file uploads', () => {
  let app: HttpApplication | undefined;

  const reset = () => {
    clearHttpGuards();
    clearHttpInterceptors();
    clearHttpRouteRegistrars();
    clearExceptionFilters();
  };

  const boot = async () => {
    reset();
    app = await createHttpApplication(UploadModule);
    return app;
  };

  afterEach(async () => {
    await app?.close();
    app = undefined;
    reset();
  });

  it('injects a single named file', async () => {
    await boot();
    const form = new FormData();
    form.append('avatar', new Blob(['hello'], { type: 'text/plain' }), 'a.txt');
    const res = await app!.handle(new Request(`${ORIGIN}/files/single`, { method: 'POST', body: form }));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { filename: string; size: number; type: string };
    expect(body.filename).toBe('a.txt');
    expect(body.size).toBe(5);
    expect(body.type).toStartWith('text/plain');
  });

  it('injects multiple files posted under the same field', async () => {
    await boot();
    const form = new FormData();
    form.append('docs', new Blob(['a'], { type: 'text/plain' }), '1.txt');
    form.append('docs', new Blob(['bb'], { type: 'text/plain' }), '2.txt');
    const res = await app!.handle(new Request(`${ORIGIN}/files/many`, { method: 'POST', body: form }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ count: 2, names: ['1.txt', '2.txt'] });
  });

  it('rejects oversized files with 413', async () => {
    await boot();
    const form = new FormData();
    form.append('avatar', new Blob(['way too many bytes'], { type: 'image/png' }), 'big.png');
    const res = await app!.handle(new Request(`${ORIGIN}/files/limited`, { method: 'POST', body: form }));
    expect(res.status).toBe(413);
  });

  it('rejects disallowed mime types with 415', async () => {
    await boot();
    const form = new FormData();
    form.append('avatar', new Blob(['ok'], { type: 'text/plain' }), 'x.txt');
    const res = await app!.handle(new Request(`${ORIGIN}/files/limited`, { method: 'POST', body: form }));
    expect(res.status).toBe(415);
  });

  it('throws 400 when a required file is missing', async () => {
    await boot();
    const form = new FormData();
    form.append('other', 'nope');
    const res = await app!.handle(new Request(`${ORIGIN}/files/single`, { method: 'POST', body: form }));
    expect(res.status).toBe(400);
  });

  it('allows an optional file to be absent', async () => {
    await boot();
    const form = new FormData();
    form.append('note', 'hi');
    const res = await app!.handle(new Request(`${ORIGIN}/files/optional`, { method: 'POST', body: form }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ present: false });
  });

  it('handles a mixed fields + files form', async () => {
    await boot();
    const form = new FormData();
    form.append('title', 'my doc');
    form.append('avatar', new Blob(['pixels'], { type: 'image/png' }), 'p.png');
    const res = await app!.handle(new Request(`${ORIGIN}/files/single`, { method: 'POST', body: form }));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ filename: 'p.png', type: 'image/png' });
  });

  it('saves a file to disk', async () => {
    await boot();
    const form = new FormData();
    form.append('doc', new Blob(['persisted'], { type: 'text/plain' }), 'd.txt');
    const res = await app!.handle(new Request(`${ORIGIN}/files/saved`, { method: 'POST', body: form }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ bytes: 9, roundTrip: 'persisted' });
  });

  it('streams into a storage adapter without buffering', async () => {
    const adapter = new CapturingAdapter();
    const file = new UploadedFileHandle(new File(['streamed-bytes'], 's.bin', { type: 'application/octet-stream' }));
    const result = await file.pipeTo(adapter, 'uploads/s.bin');
    expect(result.key).toBe('uploads/s.bin');
    expect(adapter.streamed).toEqual({ key: 'uploads/s.bin', bytes: 14 });
    expect(adapter.buffered).toBeNull();
  });

  it('falls back to buffered upload when no uploadStream is available', async () => {
    const adapter = new CapturingAdapter();
    // Present only uploadObject.
    const bufferOnly: StorageAdapterLike = { uploadObject: adapter.uploadObject.bind(adapter) };
    const file = new UploadedFileHandle(new File(['abc'], 'x.bin'));
    await file.pipeTo(bufferOnly, 'k');
    expect(adapter.buffered).toEqual({ key: 'k', bytes: 3 });
  });
});
