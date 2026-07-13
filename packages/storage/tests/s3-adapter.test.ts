import { describe, expect, it } from 'bun:test';
import {
  DeleteObjectCommand,
  PutObjectCommand,
  type S3Client,
} from '@aws-sdk/client-s3';
import { S3StorageAdapter } from '../src/index';

/**
 * A stand-in for `S3Client` that records every dispatched command instead of
 * talking to AWS. Injected through the adapter's `client` seam.
 */
class FakeS3Client {
  readonly sent: unknown[] = [];
  behaviour: (command: unknown) => unknown = () => ({});

  async send(command: unknown): Promise<unknown> {
    this.sent.push(command);
    return this.behaviour(command);
  }
}

const asClient = (fake: FakeS3Client): S3Client => fake as unknown as S3Client;

describe('S3StorageAdapter', () => {
  it('uploads via PutObjectCommand and returns a prefixed url', async () => {
    const fake = new FakeS3Client();
    const adapter = new S3StorageAdapter({
      bucket: 'assets',
      region: 'us-east-1',
      urlPrefix: 'https://cdn.example.com',
      client: asClient(fake),
    });

    const result = await adapter.uploadObject('images/logo.png', new Uint8Array([1, 2, 3]), {
      contentType: 'image/png',
      cacheControl: 'max-age=60',
    });

    expect(fake.sent).toHaveLength(1);
    const command = fake.sent[0];
    expect(command).toBeInstanceOf(PutObjectCommand);
    expect((command as PutObjectCommand).input).toEqual({
      Bucket: 'assets',
      Key: 'images/logo.png',
      Body: new Uint8Array([1, 2, 3]),
      ContentType: 'image/png',
      CacheControl: 'max-age=60',
    });
    expect(result).toEqual({
      key: 'images/logo.png',
      url: 'https://cdn.example.com/images/logo.png',
    });
  });

  it('omits the url when no urlPrefix is configured', async () => {
    const fake = new FakeS3Client();
    const adapter = new S3StorageAdapter({
      bucket: 'assets',
      region: 'us-east-1',
      client: asClient(fake),
    });

    const result = await adapter.uploadObject('file.txt', Buffer.from('hi'));
    expect(result).toEqual({ key: 'file.txt', url: undefined });
  });

  it('normalizes an ArrayBuffer body to a Uint8Array', async () => {
    const fake = new FakeS3Client();
    const adapter = new S3StorageAdapter({
      bucket: 'assets',
      region: 'us-east-1',
      client: asClient(fake),
    });

    const buffer = new Uint8Array([9, 8, 7]).buffer;
    await adapter.uploadObject('raw.bin', buffer);

    const body = (fake.sent[0] as PutObjectCommand).input.Body;
    expect(body).toBeInstanceOf(Uint8Array);
    expect(Array.from(body as Uint8Array)).toEqual([9, 8, 7]);
  });

  it('deletes via DeleteObjectCommand', async () => {
    const fake = new FakeS3Client();
    const adapter = new S3StorageAdapter({
      bucket: 'assets',
      region: 'us-east-1',
      client: asClient(fake),
    });

    await adapter.deleteObject('images/logo.png');

    expect(fake.sent).toHaveLength(1);
    expect(fake.sent[0]).toBeInstanceOf(DeleteObjectCommand);
    expect((fake.sent[0] as DeleteObjectCommand).input).toEqual({
      Bucket: 'assets',
      Key: 'images/logo.png',
    });
  });

  it('produces a locally-signed presigned url (no network)', async () => {
    // Uses the real presigner with static dummy credentials — SigV4 signing is a
    // pure local computation, so no request ever leaves the process.
    const adapter = new S3StorageAdapter({
      bucket: 'assets',
      region: 'us-east-1',
      credentials: { accessKeyId: 'AKIAEXAMPLE', secretAccessKey: 'secret' },
    });

    const url = await adapter.getSignedUrl('images/logo.png', 120);

    expect(url).toContain('assets');
    expect(url).toContain('images/logo.png');
    expect(url).toContain('X-Amz-Signature=');
    expect(url).toContain('X-Amz-Expires=120');
  });

  it('propagates SDK errors from the underlying client', async () => {
    const fake = new FakeS3Client();
    fake.behaviour = () => {
      throw new Error('AccessDenied');
    };
    const adapter = new S3StorageAdapter({
      bucket: 'assets',
      region: 'us-east-1',
      client: asClient(fake),
    });

    await expect(adapter.uploadObject('x', new Uint8Array())).rejects.toThrow('AccessDenied');
    await expect(adapter.deleteObject('x')).rejects.toThrow('AccessDenied');
  });
});
