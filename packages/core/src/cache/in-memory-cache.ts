import type { CacheSetOptions, CacheStore } from './cache-store';

interface CacheEntry<T = unknown> {
  value: T;
  expiresAt?: number;
}

export interface InMemoryCacheOptions {
  /**
   * Default time to live in milliseconds for entries set without an explicit ttl.
   * Use 0 or a negative value to disable expiration.
   */
  ttl?: number;
  /**
   * Maximum number of entries to store. When the limit is exceeded, the least
   * recently used entry is evicted.
   */
  maxEntries?: number;
}

export class InMemoryCacheStore implements CacheStore {
  private readonly store = new Map<string, CacheEntry>();
  private readonly defaultTtl?: number;
  private readonly maxEntries: number;

  constructor(options: InMemoryCacheOptions = {}) {
    this.defaultTtl = options.ttl;
    this.maxEntries = typeof options.maxEntries === 'number' ? options.maxEntries : 1000;
  }

  async get<T = unknown>(key: string): Promise<T | undefined> {
    const entry = this.store.get(key);
    if (!entry) {
      return undefined;
    }

    if (this.isExpired(entry)) {
      this.store.delete(key);
      return undefined;
    }

    // Refresh recency for LRU behavior
    this.touch(key, entry);
    return entry.value as T;
  }

  async set<T = unknown>(key: string, value: T, options?: CacheSetOptions): Promise<void> {
    const ttl = options?.ttl ?? this.defaultTtl;
    const expiresAt = ttl && ttl > 0 ? Date.now() + ttl : undefined;

    this.store.set(key, { value, expiresAt });
    this.evictIfNeeded();
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  async reset(): Promise<void> {
    this.store.clear();
  }

  private isExpired(entry: CacheEntry): boolean {
    return typeof entry.expiresAt === 'number' && entry.expiresAt <= Date.now();
  }

  private touch(key: string, entry: CacheEntry): void {
    this.store.delete(key);
    this.store.set(key, entry);
  }

  private evictIfNeeded(): void {
    if (this.maxEntries <= 0) {
      return;
    }

    while (this.store.size > this.maxEntries) {
      const oldestKey = this.store.keys().next().value;
      if (oldestKey === undefined) {
        break;
      }
      this.store.delete(oldestKey);
    }
  }
}
