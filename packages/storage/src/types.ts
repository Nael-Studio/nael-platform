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
  /**
   * Optional true-streaming upload. Adapters that implement this can accept a
   * Web `ReadableStream` and persist it without buffering the whole object in
   * memory — used by `@nl-framework/http`'s `UploadedFileHandle.pipeTo`.
   */
  uploadStream?(key: string, stream: ReadableStream<Uint8Array>, options?: UploadOptions): Promise<UploadResult>;
  deleteObject(key: string): Promise<void>;
  getSignedUrl(key: string, expiresInSeconds?: number): Promise<string>;
}
