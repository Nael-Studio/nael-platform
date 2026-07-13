import { getMetadata, setMetadata } from '../utils/metadata';

export interface ThrottleConfig {
  /** Maximum number of requests allowed within the window. */
  limit: number;
  /** Fixed-window duration in milliseconds. */
  windowMs: number;
}

const THROTTLE_METADATA_KEY = Symbol.for('nl:http:throttle');
const SKIP_THROTTLE_METADATA_KEY = Symbol.for('nl:http:throttle:skip');

/**
 * Apply a fixed-window rate limit to a controller or a single handler. Handler
 * config overrides controller config. Requires the `ThrottleGuard` to be
 * registered (globally or via `@UseGuards`).
 */
export const Throttle = (config: ThrottleConfig): ClassDecorator & MethodDecorator =>
  ((target: object, propertyKey?: string | symbol) => {
    if (propertyKey === undefined) {
      setMetadata(THROTTLE_METADATA_KEY, config, target);
    } else {
      setMetadata(THROTTLE_METADATA_KEY, config, (target as { constructor: object }).constructor ?? target, propertyKey);
    }
  }) as ClassDecorator & MethodDecorator;

/** Exempt a controller or handler from throttling. */
export const SkipThrottle = (): ClassDecorator & MethodDecorator =>
  ((target: object, propertyKey?: string | symbol) => {
    if (propertyKey === undefined) {
      setMetadata(SKIP_THROTTLE_METADATA_KEY, true, target);
    } else {
      setMetadata(SKIP_THROTTLE_METADATA_KEY, true, (target as { constructor: object }).constructor ?? target, propertyKey);
    }
  }) as ClassDecorator & MethodDecorator;

/** Resolve the effective throttle config for a route (handler wins over class). */
export const resolveThrottleConfig = (
  controller: object,
  handlerName?: string | symbol,
): ThrottleConfig | undefined => {
  if (handlerName !== undefined) {
    const method = getMetadata(THROTTLE_METADATA_KEY, controller, handlerName) as ThrottleConfig | undefined;
    if (method) {
      return method;
    }
  }
  return getMetadata(THROTTLE_METADATA_KEY, controller) as ThrottleConfig | undefined;
};

/** Whether a route (or its controller) is exempt from throttling. */
export const isThrottleSkipped = (controller: object, handlerName?: string | symbol): boolean => {
  if (handlerName !== undefined && getMetadata(SKIP_THROTTLE_METADATA_KEY, controller, handlerName)) {
    return true;
  }
  return Boolean(getMetadata(SKIP_THROTTLE_METADATA_KEY, controller));
};
