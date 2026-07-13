/**
 * A structural subset of `@nl-framework/storage`'s `StorageAdapter`. The HTTP
 * package intentionally does **not** depend on the storage package — any object
 * shaped like this (S3, Azure, a test fake) can receive a streamed upload.
 */
export interface StorageAdapterLike {
  uploadObject(
    key: string,
    data: ArrayBuffer | Uint8Array,
    options?: { contentType?: string; cacheControl?: string },
  ): Promise<{ key: string; url?: string }>;
  /**
   * Optional true-streaming path. When present, `pipeTo` streams the request
   * body straight through without buffering it in memory.
   */
  uploadStream?(
    key: string,
    stream: ReadableStream<Uint8Array>,
    options?: { contentType?: string; cacheControl?: string },
  ): Promise<{ key: string; url?: string }>;
}

/**
 * A single uploaded file extracted from a `multipart/form-data` request.
 *
 * Wraps the Web `File` yielded by `request.formData()` and exposes ergonomic
 * accessors plus helpers to persist the file to disk or stream it into any
 * `@nl-framework/storage` adapter without buffering.
 */
export class UploadedFileHandle {
  constructor(private readonly file: File) {}

  /** The original client-provided filename (`file.name`). */
  get filename(): string {
    return this.file.name;
  }

  /** The declared MIME type (`file.type`), e.g. `image/png`. */
  get mimeType(): string {
    return this.file.type;
  }

  /** File size in bytes. */
  get size(): number {
    return this.file.size;
  }

  /** Read the whole file into memory. */
  arrayBuffer(): Promise<ArrayBuffer> {
    return this.file.arrayBuffer();
  }

  /** A Web `ReadableStream` of the file's bytes (no buffering). */
  stream(): ReadableStream<Uint8Array> {
    return this.file.stream();
  }

  /** Persist the file to a filesystem path using Bun's fast `Bun.write`. */
  async saveTo(path: string): Promise<number> {
    return Bun.write(path, this.file);
  }

  /**
   * Stream the file into a storage adapter under `key`. Uses the adapter's
   * `uploadStream` when available (no buffering); otherwise falls back to
   * reading the file into memory once and calling `uploadObject`.
   */
  async pipeTo(adapter: StorageAdapterLike, key: string): Promise<{ key: string; url?: string }> {
    const options = { contentType: this.mimeType || undefined };
    if (typeof adapter.uploadStream === 'function') {
      return adapter.uploadStream(key, this.stream(), options);
    }
    const buffer = await this.arrayBuffer();
    return adapter.uploadObject(key, new Uint8Array(buffer), options);
  }
}

/** Runtime guard used by decorators + tests. */
export const isUploadedFile = (value: unknown): value is UploadedFileHandle =>
  value instanceof UploadedFileHandle;
