import type { CacheStore } from './cache-store';

/**
 * A single cache access. Keys are passed through as-is (they are developer-chosen
 * identifiers, not user PII), and no cached value is ever included.
 */
export interface CacheObservation {
  /** Store name (e.g. the default `memory` / `redis`, or a custom label). */
  store: string;
  op: 'get' | 'set' | 'delete' | 'reset';
  key?: string;
  /** Only meaningful for `get`: whether the key was present and unexpired. */
  hit?: boolean;
  at: number;
}

export interface CacheObserver {
  onCache(observation: CacheObservation): void;
}

// Module-level registry so core caches never depend on their observers (e.g.
// devtools). Consumers register an observer; the stores notify after each access.
const observers = new Set<CacheObserver>();

export const registerCacheObserver = (observer: CacheObserver): (() => void) => {
  observers.add(observer);
  return () => {
    observers.delete(observer);
  };
};

export const clearCacheObservers = (): void => {
  observers.clear();
};

/** True when at least one observer is attached — the zero-overhead gate. */
export const hasCacheObservers = (): boolean => observers.size > 0;

export const notifyCacheObservers = (observation: CacheObservation): void => {
  if (observers.size === 0) {
    return;
  }
  for (const observer of observers) {
    try {
      observer.onCache(observation);
    } catch {
      // Observers must never break the cache operation being observed.
    }
  }
};

/**
 * A named cache store registered for administrative access (e.g. a devtools
 * "invalidate key" action). Registration is independent of observation.
 */
export interface RegisteredCacheStore {
  name: string;
  store: CacheStore;
}

const stores = new Set<RegisteredCacheStore>();

export const registerCacheStore = (entry: RegisteredCacheStore): (() => void) => {
  stores.add(entry);
  return () => {
    stores.delete(entry);
  };
};

export const getCacheStores = (): RegisteredCacheStore[] => [...stores];

/** Test-only: drop all registered stores so suites don't leak into each other. */
export const clearCacheStores = (): void => {
  stores.clear();
};
