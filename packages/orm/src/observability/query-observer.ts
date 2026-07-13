/**
 * A read-query event. Values are never included — only the **filter shape**
 * (keys + operators) so observers cannot leak PII.
 */
export interface OrmQueryObservation {
  connectionName?: string;
  collection: string;
  /** `find` | `findOne` | `count` | `aggregate` | `distinct` | … */
  op: string;
  /** Keys + operators only, values redacted (e.g. `{ tenantId: '…', createdAt: { $gt: '…' } }`). */
  filterShape: Record<string, unknown>;
  durationMs: number;
  count?: number;
  at: number;
}

export interface QueryObserver {
  onQuery(observation: OrmQueryObservation): void;
}

// Module-level registry so the ORM never depends on its observers (e.g. devtools).
// Consumers register an observer; the repository notifies them after each read.
const observers = new Set<QueryObserver>();

export const registerQueryObserver = (observer: QueryObserver): (() => void) => {
  observers.add(observer);
  return () => {
    observers.delete(observer);
  };
};

export const clearQueryObservers = (): void => {
  observers.clear();
};

export const hasQueryObservers = (): boolean => observers.size > 0;

export const notifyQueryObservers = (observation: OrmQueryObservation): void => {
  if (observers.size === 0) {
    return;
  }
  for (const observer of observers) {
    try {
      observer.onQuery(observation);
    } catch {
      // Observers must never break the query being observed.
    }
  }
};

const REDACTED = '…';

/**
 * Reduces a Mongo filter to its shape: object keys are preserved, operator keys
 * (`$gt`, `$in`, …) are preserved with redacted values, and all scalar/array
 * values collapse to `'…'`. Bounded in depth to avoid pathological documents.
 */
export const describeFilterShape = (filter: unknown, depth = 0): Record<string, unknown> => {
  if (depth > 4 || filter === null || typeof filter !== 'object') {
    return {};
  }
  const shape: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(filter as Record<string, unknown>)) {
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      const nested = describeFilterShape(value, depth + 1);
      shape[key] = Object.keys(nested).length > 0 ? nested : REDACTED;
    } else {
      shape[key] = REDACTED;
    }
  }
  return shape;
};
