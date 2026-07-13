import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';

/** The transport that opened the current context. */
export type RequestContextKind = 'http' | 'graphql' | 'message';

/**
 * Ambient per-request state carried across the async call chain via
 * `AsyncLocalStorage`. Framework-neutral: HTTP, GraphQL, and message dispatch all
 * populate the same shape, and any consumer (logger, devtools, app code) reads it
 * without being coupled to the transport.
 */
export interface RequestContextData {
  /** Stable id for the whole request — inbound `x-request-id` or a fresh UUID. */
  requestId: string;
  /** `performance.now()`-style epoch millis captured when the context opened. */
  startedAt: number;
  kind: RequestContextKind;
  /** Route path, GraphQL operation name, or message pattern. */
  name: string;
  [key: string]: unknown;
}

const storage = new AsyncLocalStorage<RequestContextData>();

export interface CreateRequestContextOptions {
  kind: RequestContextKind;
  name: string;
  /** Reuse an inbound correlation id (e.g. `x-request-id`) when present. */
  requestId?: string;
  startedAt?: number;
}

/**
 * Builds a fresh {@link RequestContextData}. `requestId` falls back to a random
 * UUID; `startedAt` to `Date.now()`.
 */
export const createRequestContextData = (
  options: CreateRequestContextOptions,
): RequestContextData => ({
  requestId: options.requestId && options.requestId.length > 0 ? options.requestId : randomUUID(),
  startedAt: options.startedAt ?? Date.now(),
  kind: options.kind,
  name: options.name,
});

/**
 * Ambient request context. `run` opens a scope; `current`/`id` read it; `set`
 * attaches ad-hoc fields to the active scope (no-op when none is active).
 */
export const RequestContext = {
  /** Runs `fn` with `data` as the active context for the entire async subtree. */
  run<T>(data: RequestContextData, fn: () => T): T {
    return storage.run(data, fn);
  },

  /** Opens a context built from `options`, returning both the data and result. */
  start<T>(options: CreateRequestContextOptions, fn: (data: RequestContextData) => T): T {
    const data = createRequestContextData(options);
    return storage.run(data, () => fn(data));
  },

  /** The active context, or `undefined` when running outside any request. */
  current(): RequestContextData | undefined {
    return storage.getStore();
  },

  /** The active request id, or `undefined` outside any request. */
  id(): string | undefined {
    return storage.getStore()?.requestId;
  },

  /** Attaches a field to the active context. No-op when no context is active. */
  set(key: string, value: unknown): void {
    const store = storage.getStore();
    if (store) {
      store[key] = value;
    }
  },
} as const;
