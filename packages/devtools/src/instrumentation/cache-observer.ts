import { RequestContext } from '@nl-framework/core';
import type { CacheObservation, CacheObserver } from '@nl-framework/core';
import type { DevtoolsBus } from './bus';

/**
 * Bridges core cache-store access into the instrumentation bus, tagging each
 * `cache` event with the ambient `requestId` so the request inspector can show
 * cache hits/misses inline and the Cache panel can aggregate hit ratios.
 */
export const createCacheObserver = (bus: DevtoolsBus): CacheObserver => ({
  onCache(observation: CacheObservation): void {
    bus.emit({
      type: 'cache',
      requestId: RequestContext.id(),
      store: observation.store,
      op: observation.op,
      key: observation.key,
      hit: observation.hit,
      at: observation.at,
    });
  },
});
