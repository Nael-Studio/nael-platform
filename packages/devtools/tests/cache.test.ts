import { afterEach, describe, expect, it } from 'bun:test';
import {
  InMemoryCacheStore,
  clearCacheObservers,
  clearCacheStores,
  registerCacheObserver,
} from '@nl-framework/core';
import { analyzeCache, cacheKeyPrefix } from '../src/instrumentation/analysis';
import { createCacheObserver } from '../src/instrumentation/cache-observer';
import { getDevtoolsBus, resetDevtoolsBusForTests } from '../src/instrumentation/bus';
import { renderDashboardHtml } from '../src/http/dashboard-html';
import type { CacheEvent } from '../src/instrumentation/events';

afterEach(() => {
  clearCacheObservers();
  clearCacheStores();
  resetDevtoolsBusForTests();
});

const ev = (over: Partial<CacheEvent>): CacheEvent => ({
  type: 'cache',
  store: 'memory',
  op: 'get',
  key: 'users:1',
  hit: true,
  at: 0,
  ...over,
});

describe('cacheKeyPrefix', () => {
  it('takes the first segment before a delimiter', () => {
    expect(cacheKeyPrefix('users:1')).toBe('users');
    expect(cacheKeyPrefix('http|GET|/x')).toBe('http');
    expect(cacheKeyPrefix('flat')).toBe('flat');
  });
});

describe('analyzeCache', () => {
  it('computes hit ratios per store and per prefix', () => {
    const events: CacheEvent[] = [
      ev({ key: 'users:1', hit: true }),
      ev({ key: 'users:2', hit: false }),
      ev({ key: 'users:2', op: 'set' }),
      ev({ store: 'redis', key: 'sessions:a', hit: true }),
    ];

    const analysis = analyzeCache(events);
    expect(analysis.gets).toBe(3);
    expect(analysis.hits).toBe(2);
    // Rates are rounded to 2 decimals for display.
    expect(analysis.hitRate).toBe(0.67);

    const usersPrefix = analysis.byPrefix.find((p) => p.prefix === 'users' && p.store === 'memory')!;
    expect(usersPrefix.gets).toBe(2);
    expect(usersPrefix.hits).toBe(1);
    expect(usersPrefix.misses).toBe(1);
    expect(usersPrefix.sets).toBe(1);

    const memoryStore = analysis.byStore.find((s) => s.store === 'memory')!;
    expect(memoryStore.gets).toBe(2);
    expect(memoryStore.hits).toBe(1);
  });
});

describe('createCacheObserver', () => {
  it('bridges core cache access into the bus as cache events', async () => {
    const bus = getDevtoolsBus();
    bus.arm();
    registerCacheObserver(createCacheObserver(bus));

    const cache = new InMemoryCacheStore({ name: 'memory' });
    await cache.get('users:1'); // miss
    await cache.set('users:1', { id: 1 });
    await cache.get('users:1'); // hit

    const captured = bus.listCache();
    expect(captured.map((e) => `${e.op}:${e.hit ?? ''}`)).toEqual(
      expect.arrayContaining(['get:false', 'set:', 'get:true']),
    );
    expect(captured.every((e) => e.store === 'memory')).toBe(true);
  });
});

describe('dashboard', () => {
  it('renders a Cache tab', () => {
    const html = renderDashboardHtml({ basePath: '/__nael', title: 'Nael DevTools' });
    expect(html).toContain('data-tab="cache"');
    expect(html).toContain('id="tab-cache"');
    expect(html).toContain('/api/cache');
  });
});
