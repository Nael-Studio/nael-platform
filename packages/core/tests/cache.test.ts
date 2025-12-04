import { describe, expect, it } from 'bun:test';
import { buildCacheKey, InMemoryCacheStore } from '../src/index';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('InMemoryCacheStore', () => {
  it('returns cached values and respects ttl', async () => {
    const cache = new InMemoryCacheStore({ ttl: 10 });
    await cache.set('greeting', 'hello');

    expect(await cache.get('greeting')).toBe('hello');

    await delay(15);
    expect(await cache.get('greeting')).toBeUndefined();
  });

  it('evicts least recently used entries when maxEntries is exceeded', async () => {
    const cache = new InMemoryCacheStore({ maxEntries: 2 });
    await cache.set('a', 1);
    await cache.set('b', 2);

    // Touch "a" to make "b" the oldest
    await cache.get('a');

    await cache.set('c', 3);

    expect(await cache.get('a')).toBe(1);
    expect(await cache.get('b')).toBeUndefined();
    expect(await cache.get('c')).toBe(3);
  });

  it('clears all entries on reset', async () => {
    const cache = new InMemoryCacheStore();
    await cache.set('x', 1);
    await cache.reset();
    expect(await cache.get('x')).toBeUndefined();
  });
});

describe('buildCacheKey', () => {
  it('builds stable keys from structured input', () => {
    const keyA = buildCacheKey('GET', '/users', { active: true, roles: ['admin', 'user'] });
    const keyB = buildCacheKey('GET', '/users', { roles: ['admin', 'user'], active: true });
    expect(keyA).toBe(keyB);
  });
});
