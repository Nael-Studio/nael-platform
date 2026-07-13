import type { CacheSetOptions, CacheStore } from './cache-store';
import { hasCacheObservers, notifyCacheObservers, registerCacheStore } from './cache-observer';

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
  /** Store label surfaced to cache observers / tooling. Defaults to `memory`. */
  name?: string;
}

export class InMemoryCacheStore implements CacheStore {
  private readonly store = new Map<string, CacheEntry>();
  private readonly defaultTtl?: number;
  private readonly maxEntries: number;
  private readonly name: string;

  constructor(options: InMemoryCacheOptions = {}) {
    this.defaultTtl = options.ttl;
    this.maxEntries = typeof options.maxEntries === 'number' ? options.maxEntries : 1000;
    this.name = options.name ?? 'memory';
    registerCacheStore({ name: this.name, store: this });
  }

  async get<T = unknown>(key: string): Promise<T | undefined> {
    const entry = this.store.get(key);
    if (!entry) {
      this.observe('get', key, false);
      return undefined;
    }

    if (this.isExpired(entry)) {
      this.store.delete(key);
      this.observe('get', key, false);
      return undefined;
    }

    // Refresh recency for LRU behavior
    this.touch(key, entry);
    this.observe('get', key, true);
    return entry.value as T;
  }

  async set<T = unknown>(key: string, value: T, options?: CacheSetOptions): Promise<void> {
    const ttl = options?.ttl ?? this.defaultTtl;
    const expiresAt = ttl && ttl > 0 ? Date.now() + ttl : undefined;

    this.store.set(key, { value, expiresAt });
    this.evictIfNeeded();
    this.observe('set', key);
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
    this.observe('delete', key);
  }

  async reset(): Promise<void> {
    this.store.clear();
    this.observe('reset');
  }

  private observe(op: 'get' | 'set' | 'delete' | 'reset', key?: string, hit?: boolean): void {
    if (!hasCacheObservers()) {
      return;
    }
    notifyCacheObservers({ store: this.name, op, key, hit, at: Date.now() });
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
