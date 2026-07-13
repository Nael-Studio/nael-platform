import { afterEach, beforeAll, afterAll, describe, expect, it } from 'bun:test';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Controller, Module } from '@nl-framework/core';
import {
  clearExceptionFilters,
  clearHttpGuards,
  clearHttpInterceptors,
  clearHttpRouteRegistrars,
  createHttpApplication,
  Get,
  SseResponse,
  type HttpApplication,
} from '../src/index';

const ORIGIN = 'http://static.local';

let root: string;

@Controller('/stream')
class StreamController {
  @Get('/events')
  events() {
    async function* source() {
      yield { event: 'greeting', data: { hello: 'world' } };
      yield { data: 'plain' };
    }
    return new SseResponse(source(), { heartbeatMs: 0 });
  }
}

@Module({ controllers: [StreamController] })
class StreamModule {}

const reset = () => {
  clearHttpGuards();
  clearHttpInterceptors();
  clearHttpRouteRegistrars();
  clearExceptionFilters();
};

describe('HTTP static files', () => {
  let app: HttpApplication | undefined;

  beforeAll(() => {
    root = mkdtempSync(join(tmpdir(), 'nl-static-'));
    writeFileSync(join(root, 'app.js'), 'console.log("hi")');
  });
  afterAll(() => {
    rmSync(root, { recursive: true, force: true });
  });

  const boot = async () => {
    reset();
    app = await createHttpApplication(StreamModule, {
      serveStatic: { prefix: '/assets', root, maxAge: 3600 },
    });
    return app;
  };

  afterEach(async () => {
    await app?.close();
    app = undefined;
    reset();
  });

  it('serves an existing file with cache headers + etag', async () => {
    await boot();
    const res = await app!.handle(new Request(`${ORIGIN}/assets/app.js`));
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('console.log("hi")');
    expect(res.headers.get('cache-control')).toBe('public, max-age=3600');
    expect(res.headers.get('etag')).toBeTruthy();
  });

  it('returns 304 when the etag matches', async () => {
    await boot();
    const first = await app!.handle(new Request(`${ORIGIN}/assets/app.js`));
    const etag = first.headers.get('etag')!;
    const second = await app!.handle(
      new Request(`${ORIGIN}/assets/app.js`, { headers: { 'if-none-match': etag } }),
    );
    expect(second.status).toBe(304);
  });

  it('blocks path traversal with a 404', async () => {
    await boot();
    const res = await app!.handle(new Request(`${ORIGIN}/assets/../../../etc/passwd`));
    expect(res.status).toBe(404);
  });

  it('falls through to routing for non-static paths', async () => {
    await boot();
    const res = await app!.handle(new Request(`${ORIGIN}/stream/events`));
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/event-stream');
  });
});

describe('HTTP SSE responses', () => {
  let app: HttpApplication | undefined;

  const boot = async () => {
    reset();
    app = await createHttpApplication(StreamModule);
    return app;
  };

  afterEach(async () => {
    await app?.close();
    app = undefined;
    reset();
  });

  it('emits framed events and closes', async () => {
    await boot();
    const res = await app!.handle(new Request(`${ORIGIN}/stream/events`));
    expect(res.headers.get('content-type')).toContain('text/event-stream');
    const body = await res.text();
    expect(body).toContain('event: greeting');
    expect(body).toContain('data: {"hello":"world"}');
    expect(body).toContain('data: plain');
  });

  it('runs cleanup when the client cancels a callback source', async () => {
    let cleaned = false;
    const response = new SseResponse((emit) => {
      const t = setInterval(() => emit({ data: 'tick' }), 5);
      (t as { unref?: () => void }).unref?.();
      return () => {
        cleaned = true;
        clearInterval(t);
      };
    }).toResponse();

    const reader = response.body!.getReader();
    await reader.read();
    await reader.cancel();
    // Give the microtask queue a moment for the cancel callback to run.
    await Promise.resolve();
    expect(cleaned).toBe(true);
  });
});
