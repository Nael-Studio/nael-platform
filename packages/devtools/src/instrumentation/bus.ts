import { RingBuffer } from './ring-buffer';
import type {
  CacheEvent,
  DevtoolsEvent,
  ExceptionEvent,
  LogEvent,
  OrmQueryEvent,
  RequestDetail,
  RequestKind,
  RequestRecord,
  StepEvent,
} from './events';

export interface DevtoolsBufferSizes {
  requests: number;
  steps: number;
  queries: number;
  exceptions: number;
  logs: number;
  cache: number;
}

export const DEFAULT_BUFFER_SIZES: DevtoolsBufferSizes = {
  requests: 500,
  steps: 4000,
  queries: 2000,
  exceptions: 500,
  logs: 5000,
  cache: 2000,
};

export type DevtoolsEventListener = (event: DevtoolsEvent) => void;

export interface RequestListFilter {
  limit?: number;
  kind?: RequestKind;
  status?: RequestRecord['status'];
}

/**
 * Central instrumentation hub. Emission is a **single boolean check** away from a
 * no-op when disarmed, so leaving `DevtoolsBus.emit(...)` calls on hot paths in a
 * production build costs effectively nothing. When armed, events fan out to
 * per-type bounded ring buffers (so memory is capped) and to live subscribers
 * (SSE). Request-scoped assembly joins the buffers by `requestId`.
 */
export class DevtoolsBus {
  private armed = false;

  private readonly requests: RingBuffer<RequestRecord>;
  private readonly requestsById = new Map<string, RequestRecord>();
  private readonly steps: RingBuffer<StepEvent>;
  private readonly queries: RingBuffer<OrmQueryEvent>;
  private readonly exceptions: RingBuffer<ExceptionEvent>;
  private readonly logs: RingBuffer<LogEvent>;
  private readonly cache: RingBuffer<CacheEvent>;

  private readonly subscribers = new Set<DevtoolsEventListener>();

  constructor(sizes: DevtoolsBufferSizes = DEFAULT_BUFFER_SIZES) {
    this.requests = new RingBuffer<RequestRecord>(sizes.requests, (evicted) => {
      this.requestsById.delete(evicted.requestId);
    });
    this.steps = new RingBuffer<StepEvent>(sizes.steps);
    this.queries = new RingBuffer<OrmQueryEvent>(sizes.queries);
    this.exceptions = new RingBuffer<ExceptionEvent>(sizes.exceptions);
    this.logs = new RingBuffer<LogEvent>(sizes.logs);
    this.cache = new RingBuffer<CacheEvent>(sizes.cache);
  }

  configure(sizes: Partial<DevtoolsBufferSizes>): void {
    if (sizes.requests) this.requests.configure(sizes.requests);
    if (sizes.steps) this.steps.configure(sizes.steps);
    if (sizes.queries) this.queries.configure(sizes.queries);
    if (sizes.exceptions) this.exceptions.configure(sizes.exceptions);
    if (sizes.logs) this.logs.configure(sizes.logs);
    if (sizes.cache) this.cache.configure(sizes.cache);
  }

  arm(): void {
    this.armed = true;
  }

  disarm(): void {
    this.armed = false;
  }

  isArmed(): boolean {
    return this.armed;
  }

  /** True when nothing is listening — used by the zero-overhead assertion. */
  hasSubscribers(): boolean {
    return this.subscribers.size > 0;
  }

  subscribe(listener: DevtoolsEventListener): () => void {
    this.subscribers.add(listener);
    return () => {
      this.subscribers.delete(listener);
    };
  }

  emit(event: DevtoolsEvent): void {
    if (!this.armed) {
      return;
    }
    this.record(event);
    if (this.subscribers.size > 0) {
      for (const listener of this.subscribers) {
        try {
          listener(event);
        } catch {
          // A misbehaving subscriber must never break the request being observed.
        }
      }
    }
  }

  private record(event: DevtoolsEvent): void {
    switch (event.type) {
      case 'request:start': {
        const record: RequestRecord = {
          requestId: event.requestId,
          kind: event.kind,
          name: event.name,
          at: event.at,
          status: 'pending',
        };
        this.requests.push(record);
        this.requestsById.set(event.requestId, record);
        break;
      }
      case 'request:end': {
        const record = this.requestsById.get(event.requestId);
        if (record) {
          record.durationMs = event.durationMs;
          record.httpStatus = event.status;
          record.error = event.error;
          record.status = event.error ? 'error' : 'ok';
        }
        break;
      }
      case 'step':
        this.steps.push(event);
        break;
      case 'orm:query':
        this.queries.push(event);
        break;
      case 'exception':
        this.exceptions.push(event);
        break;
      case 'log':
        this.logs.push(event);
        break;
      case 'cache':
        this.cache.push(event);
        break;
    }
  }

  listRequests(filter: RequestListFilter = {}): RequestRecord[] {
    let records = this.requests.recent();
    if (filter.kind) {
      records = records.filter((record) => record.kind === filter.kind);
    }
    if (filter.status) {
      records = records.filter((record) => record.status === filter.status);
    }
    return typeof filter.limit === 'number' ? records.slice(0, filter.limit) : records;
  }

  getRequest(requestId: string): RequestDetail | undefined {
    const record = this.requestsById.get(requestId);
    if (!record) {
      return undefined;
    }
    const byId = <T extends { requestId?: string }>(buffer: RingBuffer<T>): T[] =>
      buffer.filter((item) => item.requestId === requestId);
    return {
      ...record,
      steps: byId(this.steps).sort((a, b) => a.at - b.at),
      queries: byId(this.queries).sort((a, b) => a.at - b.at),
      logs: byId(this.logs).sort((a, b) => a.at - b.at),
      exceptions: byId(this.exceptions).sort((a, b) => a.at - b.at),
      cache: byId(this.cache).sort((a, b) => a.at - b.at),
    };
  }

  listQueries(limit?: number): OrmQueryEvent[] {
    return this.queries.recent(limit);
  }

  listExceptions(limit?: number): ExceptionEvent[] {
    return this.exceptions.recent(limit);
  }

  listLogs(limit?: number): LogEvent[] {
    return this.logs.recent(limit);
  }

  listCache(limit?: number): CacheEvent[] {
    return this.cache.recent(limit);
  }

  reset(): void {
    this.requests.clear();
    this.requestsById.clear();
    this.steps.clear();
    this.queries.clear();
    this.exceptions.clear();
    this.logs.clear();
    this.cache.clear();
    this.subscribers.clear();
  }
}

let singleton: DevtoolsBus | undefined;

export const getDevtoolsBus = (): DevtoolsBus => {
  if (!singleton) {
    singleton = new DevtoolsBus();
  }
  return singleton;
};

export const resetDevtoolsBusForTests = (): void => {
  singleton = undefined;
};
