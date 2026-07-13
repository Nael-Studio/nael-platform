import { RequestContext, getControllerPrefix } from '@nl-framework/core';
import {
  registerHttpInterceptor,
  type CallHandler,
  type HttpExecutionContext,
  type InterceptorFunction,
} from '@nl-framework/http';
import type { DevtoolsBus } from './bus';

const joinPath = (prefix: string, path: string): string => {
  const left = prefix.endsWith('/') ? prefix.slice(0, -1) : prefix;
  const right = path.startsWith('/') ? path : `/${path}`;
  const joined = `${left}${right}`.replace(/\/{2,}/g, '/');
  return joined.length > 1 && joined.endsWith('/') ? joined.slice(0, -1) : joined;
};

const routeName = (ctx: HttpExecutionContext): string => {
  const route = ctx.getRoute();
  const prefix = route.controller ? getControllerPrefix(route.controller) ?? '' : '';
  return `${route.definition.method} ${joinPath(prefix, route.definition.path)}`;
};

/**
 * Emits `request:start`/`request:end` plus a `handler` step to the instrumentation
 * bus for every matched HTTP handler, tagged with the ambient `requestId` so the
 * request inspector can join ORM queries, logs, and exceptions to it. Reuses the
 * request-scoped interceptor seam — no router changes required.
 */
export const createHttpRequestInterceptor =
  (bus: DevtoolsBus): InterceptorFunction =>
  async (ctx: HttpExecutionContext, next: CallHandler) => {
    const requestId = RequestContext.id() ?? `http-${Date.now()}`;
    const name = routeName(ctx);
    const startedAt = Date.now();
    const start = performance.now();

    bus.emit({ type: 'request:start', requestId, kind: 'http', name, at: startedAt });

    let status: number | undefined;
    let error: string | undefined;
    try {
      const result = await next.handle();
      if (result instanceof Response) {
        status = result.status;
      }
      return result;
    } catch (thrown) {
      error = thrown instanceof Error ? `${thrown.name}: ${thrown.message}` : String(thrown);
      bus.emit({
        type: 'exception',
        requestId,
        name: thrown instanceof Error ? thrown.name : 'Error',
        message: thrown instanceof Error ? thrown.message : String(thrown),
        stack: thrown instanceof Error ? thrown.stack : undefined,
        at: Date.now(),
      });
      throw thrown;
    } finally {
      const durationMs = performance.now() - start;
      bus.emit({
        type: 'step',
        requestId,
        step: 'handler',
        token: name,
        at: startedAt,
        durationMs,
        outcome: error ? 'throw' : 'pass',
      });
      bus.emit({
        type: 'request:end',
        requestId,
        kind: 'http',
        name,
        at: Date.now(),
        durationMs,
        status: error ? status ?? 500 : status,
        error,
      });
    }
  };

let installed = false;

/** Install the bus-backed HTTP request interceptor once (idempotent). */
export const installRequestInstrumentation = (bus: DevtoolsBus): void => {
  if (installed) {
    return;
  }
  installed = true;
  registerHttpInterceptor(createHttpRequestInterceptor(bus));
};

export const resetRequestInstrumentationForTests = (): void => {
  installed = false;
};
