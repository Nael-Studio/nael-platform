export interface UploadOptions {
  contentType?: string;
  cacheControl?: string;
}

export interface UploadResult {
  key: string;
  url?: string;
}

export interface StorageAdapter {
  uploadObject(key: string, data: ArrayBuffer | Uint8Array | Buffer, options?: UploadOptions): Promise<UploadResult>;
  deleteObject(key: string): Promise<void>;
  getSignedUrl(key: string, expiresInSeconds?: number): Promise<string>;
}
