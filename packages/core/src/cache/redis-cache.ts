import type Redis from 'ioredis';
import type { CacheSetOptions, CacheStore } from './cache-store';
import { hasCacheObservers, notifyCacheObservers, registerCacheStore } from './cache-observer';

export interface RedisCacheOptions {
  /**
   * Default TTL in milliseconds for entries without an explicit ttl.
   */
  ttl?: number;
  /**
   * Optional prefix applied to every key.
   */
  prefix?: string;
  /** Store label surfaced to cache observers / tooling. Defaults to `redis`. */
  name?: string;
}

export class RedisCacheStore implements CacheStore {
  private readonly name: string;

  constructor(
    private readonly client: Redis,
    private readonly options: RedisCacheOptions = {},
  ) {
    this.name = options.name ?? 'redis';
    registerCacheStore({ name: this.name, store: this });
  }

  async get<T = unknown>(key: string): Promise<T | undefined> {
    const namespacedKey = this.withPrefix(key);
    const raw = await this.client.get(namespacedKey);
    if (raw === null) {
      this.observe('get', key, false);
      return undefined;
    }
    this.observe('get', key, true);
    return JSON.parse(raw) as T;
  }

  async set<T = unknown>(key: string, value: T, options?: CacheSetOptions): Promise<void> {
    const namespacedKey = this.withPrefix(key);
    const ttl = options?.ttl ?? this.options.ttl;
    const serialized = JSON.stringify(value);

    if (ttl && ttl > 0) {
      await this.client.set(namespacedKey, serialized, 'PX', ttl);
    } else {
      await this.client.set(namespacedKey, serialized);
    }
    this.observe('set', key);
  }

  async delete(key: string): Promise<void> {
    await this.client.del(this.withPrefix(key));
    this.observe('delete', key);
  }

  async reset(): Promise<void> {
    if (this.options.prefix) {
      const pattern = `${this.options.prefix}:*`;
      const stream = this.client.scanStream({ match: pattern, count: 100 });

      return new Promise((resolve, reject) => {
        stream.on('data', async (keys: string[]) => {
          if (keys.length > 0) {
            stream.pause();
            try {
              await this.client.unlink(...keys);
              stream.resume();
            } catch (e) {
              reject(e);
            }
          }
        });
        stream.on('end', () => resolve());
        stream.on('error', (e) => reject(e));
      });
    }

    await this.client.flushdb();
    this.observe('reset');
  }

  private observe(op: 'get' | 'set' | 'delete' | 'reset', key?: string, hit?: boolean): void {
    if (!hasCacheObservers()) {
      return;
    }
    notifyCacheObservers({ store: this.name, op, key, hit, at: Date.now() });
  }

  private withPrefix(key: string): string {
    if (!this.options.prefix) {
      return key;
    }
    return `${this.options.prefix}:${key}`;
  }
}
