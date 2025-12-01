export interface CacheSetOptions {
  /**
   * Time to live in milliseconds. When not provided, the store default is used.
   * Use 0 or a negative value to disable expiration.
   */
  ttl?: number;
}

export interface CacheStore {
  get<T = unknown>(key: string): Promise<T | undefined>;
  set<T = unknown>(key: string, value: T, options?: CacheSetOptions): Promise<void>;
  delete(key: string): Promise<void>;
  reset(): Promise<void>;
}
