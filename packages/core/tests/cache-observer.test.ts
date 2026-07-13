import { afterEach, describe, expect, it } from 'bun:test';
import {
  InMemoryCacheStore,
  clearCacheObservers,
  clearCacheStores,
  getCacheStores,
  registerCacheObserver,
  type CacheObservation,
} from '../src';

afterEach(() => {
  clearCacheObservers();
  clearCacheStores();
});

describe('cache observation', () => {
  it('emits hit/miss/set/delete observations to registered observers', async () => {
    const seen: CacheObservation[] = [];
    registerCacheObserver({ onCache: (o) => seen.push(o) });

    const cache = new InMemoryCacheStore({ name: 'test' });
    await cache.get('a'); // miss
    await cache.set('a', 1);
    await cache.get('a'); // hit
    await cache.delete('a');

    expect(seen.map((o) => `${o.op}:${o.hit ?? ''}`)).toEqual([
      'get:false',
      'set:',
      'get:true',
      'delete:',
    ]);
    expect(seen.every((o) => o.store === 'test')).toBe(true);
  });

  it('adds no measurable work when no observer is attached', async () => {
    // No observer registered: get/set must still behave and never throw.
    const cache = new InMemoryCacheStore();
    await cache.set('k', 'v');
    expect(await cache.get('k')).toBe('v');
    expect(await cache.get('missing')).toBeUndefined();
  });

  it('registers stores so tooling can invalidate keys by store name', async () => {
    const cache = new InMemoryCacheStore({ name: 'sessions' });
    await cache.set('sessions:1', { userId: 1 });

    const registered = getCacheStores().find((entry) => entry.name === 'sessions');
    expect(registered).toBeDefined();

    await registered!.store.delete('sessions:1');
    expect(await cache.get('sessions:1')).toBeUndefined();
  });
});
