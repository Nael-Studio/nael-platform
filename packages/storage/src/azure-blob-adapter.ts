import { BlobServiceClient, StorageSharedKeyCredential } from '@azure/storage-blob';
import type { StorageAdapter, UploadOptions, UploadResult } from './types';

export interface AzureBlobAdapterOptions {
  accountName: string;
  accountKey: string;
  container: string;
  urlPrefix?: string;
}

export class AzureBlobStorageAdapter implements StorageAdapter {
  private readonly service: BlobServiceClient;
  private readonly containerName: string;
  private readonly urlPrefix?: string;

  constructor(options: AzureBlobAdapterOptions) {
    const credential = new StorageSharedKeyCredential(options.accountName, options.accountKey);
    this.service = new BlobServiceClient(
      `https://${options.accountName}.blob.core.windows.net`,
      credential,
    );
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
      permissions: 'r',
    });
    return sas;
  }
}
