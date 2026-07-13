import { RequestContext } from '@nl-framework/core';
import {
  registerGraphqlInterceptor,
  type GraphqlCallHandler,
  type GraphqlExecutionContext,
  type GraphqlInterceptorFunction,
} from '@nl-framework/graphql';
import type { DevtoolsBus } from './bus';

const ROOT_OPERATION_TYPES = new Set(['Query', 'Mutation', 'Subscription']);
/** Skip trivial property-read resolvers below this so the step buffer isn't flooded. */
const FIELD_NOISE_FLOOR_MS = 1;

/**
 * Emits a per-resolver `step` event to the instrumentation bus, tagged with the
 * ambient `requestId` (the enclosing HTTP request over which GraphQL runs) so the
 * request inspector interleaves resolver timings — and any resolver throw — with
 * the operation's ORM queries and logs. Root operations always emit; nested field
 * resolvers only when they take real time or throw.
 */
export const createGraphqlRequestInterceptor =
  (bus: DevtoolsBus): GraphqlInterceptorFunction =>
  async (ctx: GraphqlExecutionContext, next: GraphqlCallHandler) => {
    const info = ctx.getInfo();
    const parent = info.parentType.name;
    const token = `${parent}.${info.fieldName}`;
    const isRoot = ROOT_OPERATION_TYPES.has(parent);
    const requestId = RequestContext.id() ?? `gql-${Date.now()}`;
    const startedAt = Date.now();
    const start = performance.now();

    let error: string | undefined;
    try {
      return await next.handle();
    } catch (thrown) {
      error = thrown instanceof Error ? `${thrown.name}: ${thrown.message}` : String(thrown);
      bus.emit({
        type: 'exception',
        requestId,
        name: thrown instanceof Error ? thrown.name : 'Error',
        message: thrown instanceof Error ? thrown.message : String(thrown),
        stack: thrown instanceof Error ? thrown.stack : undefined,
        handledBy: token,
        at: Date.now(),
      });
      throw thrown;
    } finally {
      const durationMs = performance.now() - start;
      if (isRoot || durationMs >= FIELD_NOISE_FLOOR_MS || error) {
        bus.emit({
          type: 'step',
          requestId,
          step: 'handler',
          token,
          at: startedAt,
          durationMs,
          outcome: error ? 'throw' : 'pass',
        });
      }
    }
  };

let installed = false;

/** Install the bus-backed GraphQL resolver interceptor once (idempotent). */
export const installGraphqlInstrumentation = (bus: DevtoolsBus): void => {
  if (installed) {
    return;
  }
  installed = true;
  registerGraphqlInterceptor(createGraphqlRequestInterceptor(bus));
};

export const resetGraphqlInstrumentationForTests = (): void => {
  installed = false;
};
