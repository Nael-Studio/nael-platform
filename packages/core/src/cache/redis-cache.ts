import type Redis from 'ioredis';
import type { CacheSetOptions, CacheStore } from './cache-store';

export interface RedisCacheOptions {
  /**
   * Default TTL in milliseconds for entries without an explicit ttl.
   */
  ttl?: number;
  /**
   * Optional prefix applied to every key.
   */
  prefix?: string;
}

export class RedisCacheStore implements CacheStore {
  constructor(
    private readonly client: Redis,
    private readonly options: RedisCacheOptions = {},
  ) {}

  async get<T = unknown>(key: string): Promise<T | undefined> {
    const namespacedKey = this.withPrefix(key);
    const raw = await this.client.get(namespacedKey);
    if (raw === null) {
      return undefined;
    }
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
  }

  async delete(key: string): Promise<void> {
    await this.client.del(this.withPrefix(key));
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
  }

  private withPrefix(key: string): string {
    if (!this.options.prefix) {
      return key;
    }
    return `${this.options.prefix}:${key}`;
  }
}
