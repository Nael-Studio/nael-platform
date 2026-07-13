import { Readable } from 'node:stream';
import { BlobSASPermissions, BlobServiceClient, StorageSharedKeyCredential } from '@azure/storage-blob';
import type { StorageAdapter, UploadOptions, UploadResult } from './types';

export interface AzureBlobAdapterOptions {
  accountName: string;
  accountKey: string;
  container: string;
  urlPrefix?: string;
  /**
   * A preconstructed `BlobServiceClient`. When provided it is used verbatim and
   * `accountName`/`accountKey` are ignored for client construction — primarily a
   * seam for tests that inject a mocked service.
   */
  service?: BlobServiceClient;
}

export class AzureBlobStorageAdapter implements StorageAdapter {
  private readonly service: BlobServiceClient;
  private readonly containerName: string;
  private readonly urlPrefix?: string;

  constructor(options: AzureBlobAdapterOptions) {
    if (options.service) {
      this.service = options.service;
    } else {
      const credential = new StorageSharedKeyCredential(options.accountName, options.accountKey);
      this.service = new BlobServiceClient(
        `https://${options.accountName}.blob.core.windows.net`,
        credential,
      );
    }
    this.containerName = options.container;
    this.urlPrefix = options.urlPrefix;
  }

  private getContainer() {
    return this.service.getContainerClient(this.containerName);
  }

  async uploadObject(key: string, data: ArrayBuffer | Uint8Array | Buffer, options?: UploadOptions): Promise<UploadResult> {
    const container = this.getContainer();
    const blob = container.getBlockBlobClient(key);
    await blob.uploadData(data, {
      blobHTTPHeaders: {
        blobContentType: options?.contentType,
        blobCacheControl: options?.cacheControl,
      },
    });

    return {
      key,
      url: this.urlPrefix ? `${this.urlPrefix}/${key}` : blob.url,
    };
  }

  async uploadStream(
    key: string,
    stream: ReadableStream<Uint8Array>,
    options?: UploadOptions,
  ): Promise<UploadResult> {
    const container = this.getContainer();
    const blob = container.getBlockBlobClient(key);
    // Azure's block-blob client streams from a Node `Readable`; convert the Web
    // stream without buffering the whole object.
    const nodeStream = Readable.fromWeb(stream as unknown as Parameters<typeof Readable.fromWeb>[0]);
    await blob.uploadStream(nodeStream, undefined, undefined, {
      blobHTTPHeaders: {
        blobContentType: options?.contentType,
        blobCacheControl: options?.cacheControl,
      },
    });

    return {
      key,
      url: this.urlPrefix ? `${this.urlPrefix}/${key}` : blob.url,
    };
  }

  async deleteObject(key: string): Promise<void> {
    const container = this.getContainer();
    const blob = container.getBlockBlobClient(key);
    await blob.deleteIfExists();
  }

  async getSignedUrl(key: string, expiresInSeconds = 900): Promise<string> {
    const container = this.getContainer();
    const blob = container.getBlockBlobClient(key);
    const sas = await blob.generateSasUrl({
      expiresOn: new Date(Date.now() + expiresInSeconds * 1000),
      permissions: BlobSASPermissions.parse('r'),
    });
    return sas;
  }
}
