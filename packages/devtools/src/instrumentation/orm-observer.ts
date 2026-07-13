import { RequestContext } from '@nl-framework/core';
import type { OrmQueryObservation, QueryObserver } from '@nl-framework/orm';
import type { DevtoolsBus } from './bus';

/**
 * Bridges the ORM's read-query stream into the instrumentation bus, tagging each
 * `orm:query` event with the ambient `requestId` so the request inspector can
 * interleave queries at their timestamps and the ORM panel can flag N+1 smells.
 */
export const createOrmQueryObserver = (bus: DevtoolsBus): QueryObserver => ({
  onQuery(observation: OrmQueryObservation): void {
    bus.emit({
      type: 'orm:query',
      requestId: RequestContext.id(),
      collection: observation.collection,
      op: observation.op,
      filterShape: observation.filterShape,
      durationMs: observation.durationMs,
      count: observation.count,
      at: observation.at,
    });
  },
});
