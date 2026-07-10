import { getControllerPrefix } from '@nl-framework/core';
import {
  registerHttpInterceptor,
  type CallHandler,
  type HttpExecutionContext,
  type InterceptorFunction,
} from '@nl-framework/http';
import {
  registerGraphqlInterceptor,
  type GraphqlExecutionContext,
  type GraphqlInterceptorFunction,
} from '@nl-framework/graphql';
import { getMetricsCollector, type MetricsCollector } from './collector';

const ROOT_OPERATION_TYPES = new Set(['Query', 'Mutation', 'Subscription']);
/** Non-root field resolvers below this are trivial property reads — don't flood the buffer. */
const FIELD_NOISE_FLOOR_MS = 1;

const joinPath = (prefix: string, path: string): string => {
  const left = prefix.endsWith('/') ? prefix.slice(0, -1) : prefix;
  const right = path.startsWith('/') ? path : `/${path}`;
  const joined = `${left}${right}`.replace(/\/{2,}/g, '/');
  return joined.length > 1 && joined.endsWith('/') ? joined.slice(0, -1) : joined;
};

const httpRouteName = (ctx: HttpExecutionContext): string => {
  const route = ctx.getRoute();
  const method = route.definition.method;
  const controller = route.controller;
  const prefix = controller ? getControllerPrefix(controller) ?? '' : '';
  return `${method} ${joinPath(prefix, route.definition.path)}`;
};

/**
 * Times every matched HTTP handler and records a sample. Purely functional and
 * self-contained (module-level collector, no DI). Note: requests that 404
 * before matching a handler never reach interceptors — total-request latency
 * incl. 404s would need global middleware, which the plugin API can't install.
 */
export const createHttpTimingInterceptor =
  (collector: MetricsCollector): InterceptorFunction =>
  async (ctx: HttpExecutionContext, next: CallHandler) => {
    const start = performance.now();
    let ok = true;
    try {
      const result = await next.handle();
      if (result instanceof Response && result.status >= 500) {
        ok = false;
      }
      return result;
    } catch (error) {
      ok = false;
      throw error;
    } finally {
      collector.record({
        kind: 'http',
        name: httpRouteName(ctx),
        durationMs: performance.now() - start,
        ok,
        at: Date.now(),
      });
    }
  };

/**
 * Times every GraphQL resolver. Root operations (Query/Mutation/Subscription)
 * are always recorded; nested object-field resolvers are recorded only when
 * they take real time, so default property reads don't evict useful samples.
 */
export const createGraphqlTimingInterceptor =
  (collector: MetricsCollector): GraphqlInterceptorFunction =>
  async (ctx: GraphqlExecutionContext, next: CallHandler) => {
    const start = performance.now();
    let ok = true;
    try {
      return await next.handle();
    } catch (error) {
      ok = false;
      throw error;
    } finally {
      const info = ctx.getInfo();
      const parent = info.parentType.name;
      const durationMs = performance.now() - start;
      const isRoot = ROOT_OPERATION_TYPES.has(parent);
      if (isRoot || durationMs >= FIELD_NOISE_FLOOR_MS) {
        collector.record({
          kind: 'graphql',
          name: `${parent}.${info.fieldName}`,
          durationMs,
          ok,
          at: Date.now(),
        });
      }
    }
  };

let installed = false;

/** Install the global timing interceptors once (idempotent). */
export const installMetricsInterceptors = (): void => {
  if (installed) {
    return;
  }
  installed = true;
  const collector = getMetricsCollector();
  registerHttpInterceptor(createHttpTimingInterceptor(collector));
  registerGraphqlInterceptor(createGraphqlTimingInterceptor(collector));
};

/** Test-only: reset the idempotent install flag. */
export const resetMetricsInterceptorsForTests = (): void => {
  installed = false;
};
