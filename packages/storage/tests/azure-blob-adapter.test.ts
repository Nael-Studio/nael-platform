import { describe, expect, it } from 'bun:test';
import type { BlobServiceClient } from '@azure/storage-blob';
import { AzureBlobStorageAdapter } from '../src/index';

interface UploadCall {
  data: unknown;
  options: unknown;
}

/**
 * A fake `BlockBlobClient` that records interactions instead of hitting Azure.
 */
class FakeBlockBlobClient {
  readonly uploads: UploadCall[] = [];
  readonly sasCalls: unknown[] = [];
  deleteCalls = 0;
  uploadBehaviour: () => unknown = () => ({});

  constructor(
    readonly url: string,
    private readonly sasUrl: string,
  ) {}

  async uploadData(data: unknown, options: unknown): Promise<unknown> {
    this.uploads.push({ data, options });
    return this.uploadBehaviour();
  }

  async deleteIfExists(): Promise<{ succeeded: boolean }> {
    this.deleteCalls += 1;
    return { succeeded: true };
  }

  async generateSasUrl(options: unknown): Promise<string> {
    this.sasCalls.push(options);
    return this.sasUrl;
  }
}

class FakeContainerClient {
  readonly requestedKeys: string[] = [];

  constructor(private readonly blob: FakeBlockBlobClient) {}

  getBlockBlobClient(key: string): FakeBlockBlobClient {
    this.requestedKeys.push(key);
    return this.blob;
  }
}

const makeService = (container: FakeContainerClient) => {
  const requestedContainers: string[] = [];
  const service = {
    requestedContainers,
    getContainerClient(name: string): FakeContainerClient {
      requestedContainers.push(name);
      return container;
    },
  };
  return service as unknown as BlobServiceClient & { requestedContainers: string[] };
};

describe('AzureBlobStorageAdapter', () => {
  it('uploads via uploadData and returns the blob url when no prefix is set', async () => {
    const blob = new FakeBlockBlobClient('https://acct.blob.core.windows.net/media/logo.png', 'sas');
    const container = new FakeContainerClient(blob);
    const service = makeService(container);

    const adapter = new AzureBlobStorageAdapter({
      accountName: 'acct',
      accountKey: 'key',
      container: 'media',
      service,
    });

    const result = await adapter.uploadObject('logo.png', new Uint8Array([1, 2]), {
      contentType: 'image/png',
      cacheControl: 'max-age=30',
    });

    expect(service.requestedContainers).toEqual(['media']);
    expect(container.requestedKeys).toEqual(['logo.png']);
    expect(blob.uploads).toHaveLength(1);
    expect(blob.uploads[0]).toEqual({
      data: new Uint8Array([1, 2]),
      options: {
        blobHTTPHeaders: {
          blobContentType: 'image/png',
          blobCacheControl: 'max-age=30',
        },
      },
    });
    expect(result).toEqual({
      key: 'logo.png',
      url: 'https://acct.blob.core.windows.net/media/logo.png',
    });
  });

  it('prefers the configured urlPrefix over the blob url', async () => {
    const blob = new FakeBlockBlobClient('https://acct.blob.core.windows.net/media/logo.png', 'sas');
    const adapter = new AzureBlobStorageAdapter({
      accountName: 'acct',
      accountKey: 'key',
      container: 'media',
      urlPrefix: 'https://cdn.example.com',
      service: makeService(new FakeContainerClient(blob)),
    });

    const result = await adapter.uploadObject('logo.png', new Uint8Array([1]));
    expect(result).toEqual({ key: 'logo.png', url: 'https://cdn.example.com/logo.png' });
  });

  it('deletes via deleteIfExists', async () => {
    const blob = new FakeBlockBlobClient('https://acct/logo.png', 'sas');
    const adapter = new AzureBlobStorageAdapter({
      accountName: 'acct',
      accountKey: 'key',
      container: 'media',
      service: makeService(new FakeContainerClient(blob)),
    });

    await adapter.deleteObject('logo.png');
    expect(blob.deleteCalls).toBe(1);
  });

  it('signs urls via generateSasUrl with a read permission and expiry', async () => {
    const blob = new FakeBlockBlobClient('https://acct/logo.png', 'https://acct/logo.png?sig=abc');
    const adapter = new AzureBlobStorageAdapter({
      accountName: 'acct',
      accountKey: 'key',
      container: 'media',
      service: makeService(new FakeContainerClient(blob)),
    });

    const url = await adapter.getSignedUrl('logo.png', 60);

    expect(url).toBe('https://acct/logo.png?sig=abc');
    expect(blob.sasCalls).toHaveLength(1);
    const sas = blob.sasCalls[0] as { expiresOn: Date; permissions: { read: boolean } };
    expect(sas.permissions.read).toBe(true);
    expect(sas.expiresOn).toBeInstanceOf(Date);
    expect(sas.expiresOn.getTime()).toBeGreaterThan(Date.now());
  });

  it('propagates SDK errors from uploadData', async () => {
    const blob = new FakeBlockBlobClient('https://acct/logo.png', 'sas');
    blob.uploadBehaviour = () => {
      throw new Error('AuthorizationFailure');
    };
    const adapter = new AzureBlobStorageAdapter({
      accountName: 'acct',
      accountKey: 'key',
      container: 'media',
      service: makeService(new FakeContainerClient(blob)),
    });

    await expect(adapter.uploadObject('logo.png', new Uint8Array())).rejects.toThrow(
      'AuthorizationFailure',
    );
  });
});
