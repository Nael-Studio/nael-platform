export type RequestKind = 'http' | 'graphql' | 'message';

export type PipelineStep =
  | 'middleware'
  | 'guard'
  | 'interceptor'
  | 'pipe'
  | 'handler'
  | 'filter';

export type StepOutcome = 'pass' | 'deny' | 'throw' | 'transform';

export interface RequestStartEvent {
  type: 'request:start';
  requestId: string;
  kind: RequestKind;
  name: string;
  at: number;
}

export interface RequestEndEvent {
  type: 'request:end';
  requestId: string;
  kind: RequestKind;
  name: string;
  at: number;
  durationMs: number;
  status?: number | string;
  error?: string;
}

export interface StepEvent {
  type: 'step';
  requestId: string;
  step: PipelineStep;
  token: string;
  at: number;
  durationMs: number;
  outcome: StepOutcome;
}

export interface OrmQueryEvent {
  type: 'orm:query';
  requestId?: string;
  collection: string;
  op: string;
  /** Keys + operators only, values redacted (e.g. `{ tenantId: '…' }`). */
  filterShape: Record<string, unknown>;
  durationMs: number;
  count?: number;
  at: number;
}

export interface ExceptionEvent {
  type: 'exception';
  requestId?: string;
  name: string;
  message: string;
  stack?: string;
  handledBy?: string;
  at: number;
}

export interface LogEvent {
  type: 'log';
  requestId?: string;
  level: string;
  context?: string;
  message: string;
  at: number;
}

export interface CacheEvent {
  type: 'cache';
  requestId?: string;
  store: string;
  op: 'get' | 'set' | 'delete' | 'reset';
  /** Absent for `reset` (whole-store) events. */
  key?: string;
  /** Only meaningful for `get`: whether the key was present. */
  hit?: boolean;
  at: number;
}

export type DevtoolsEvent =
  | RequestStartEvent
  | RequestEndEvent
  | StepEvent
  | OrmQueryEvent
  | ExceptionEvent
  | LogEvent
  | CacheEvent;

/** Assembled per-request view returned by `GET /api/requests/:id`. */
export interface RequestRecord {
  requestId: string;
  kind: RequestKind;
  name: string;
  at: number;
  status: 'pending' | 'ok' | 'error';
  httpStatus?: number | string;
  durationMs?: number;
  error?: string;
}

export interface RequestDetail extends RequestRecord {
  steps: StepEvent[];
  queries: OrmQueryEvent[];
  logs: LogEvent[];
  exceptions: ExceptionEvent[];
  cache: CacheEvent[];
}
