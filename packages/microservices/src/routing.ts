import type { MessagePattern } from './interfaces/transport';

/**
 * Namespace prefix for the HTTP endpoints the framework exposes to Dapr. Message
 * patterns are invoked at `/{INVOCATION_PREFIX}/{slug}` and pub/sub events are
 * delivered to the same deterministic path.
 */
export const INVOCATION_PREFIX = '_nl/msg';

/**
 * Deterministic, reversible-enough slug for a pattern:
 * - a string pattern is used verbatim (`orders.get` → `orders.get`)
 * - an object pattern becomes its entries sorted by key and joined
 *   (`{ cmd: 'get', svc: 'orders' }` → `cmd.get.svc.orders`)
 */
export const patternToSlug = (pattern: MessagePattern): string => {
  if (typeof pattern === 'string') {
    return pattern;
  }
  return Object.entries(pattern)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}.${String(value)}`)
    .join('.');
};

/** The Dapr service-invocation `method` path for a pattern (no leading slash). */
export const patternToInvocationPath = (pattern: MessagePattern): string =>
  `${INVOCATION_PREFIX}/${patternToSlug(pattern)}`;

/** The HTTP route (leading slash) the framework serves for a pattern. */
export const patternToRoute = (pattern: MessagePattern): string =>
  `/${patternToInvocationPath(pattern)}`;

export interface HandlerDescriptor {
  pattern: MessagePattern;
  isEvent: boolean;
}

/** One entry of the Dapr `GET /dapr/subscribe` document. */
export interface DaprSubscription {
  pubsubname: string;
  topic: string;
  route: string;
}

/**
 * Build the Dapr subscription document — one entry per `@EventPattern` handler.
 * `@MessagePattern` handlers are request/response only and are never subscribed.
 */
export const buildDaprSubscriptions = (
  handlers: ReadonlyArray<HandlerDescriptor>,
  options: { pubsubName: string },
): DaprSubscription[] =>
  handlers
    .filter((handler) => handler.isEvent)
    .map((handler) => ({
      pubsubname: options.pubsubName,
      topic: patternToSlug(handler.pattern),
      route: patternToRoute(handler.pattern),
    }));

export interface InvocationRoute {
  pattern: MessagePattern;
  path: string;
}

/**
 * Build the request/response invocation routes — one per `@MessagePattern`
 * handler only (`@EventPattern` handlers are NOT exposed for invocation).
 */
export const buildInvocationRoutes = (
  handlers: ReadonlyArray<HandlerDescriptor>,
): InvocationRoute[] =>
  handlers
    .filter((handler) => !handler.isEvent)
    .map((handler) => ({ pattern: handler.pattern, path: patternToRoute(handler.pattern) }));
