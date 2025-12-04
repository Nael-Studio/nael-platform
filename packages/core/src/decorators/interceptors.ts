import 'reflect-metadata';
import { isStage3ClassContext, isStage3MethodContext } from './metadata-helpers';

export type InterceptorToken = unknown;

const INTERCEPTORS_METADATA_KEY = Symbol.for('nl:http:interceptors:metadata');

type AnyInterceptorToken = InterceptorToken;

const defineInterceptorMetadata = (
  target: object,
  value: AnyInterceptorToken[],
  propertyKey?: string | symbol,
): void => {
  if (propertyKey !== undefined) {
    Reflect.defineMetadata(INTERCEPTORS_METADATA_KEY, value, target, propertyKey);
    return;
  }
  Reflect.defineMetadata(INTERCEPTORS_METADATA_KEY, value, target);
};

const readInterceptorMetadata = (
  target: object,
  propertyKey?: string | symbol,
): AnyInterceptorToken[] => {
  const existing =
    (propertyKey !== undefined
      ? (Reflect.getMetadata(INTERCEPTORS_METADATA_KEY, target, propertyKey) as AnyInterceptorToken[] | undefined)
      : (Reflect.getMetadata(INTERCEPTORS_METADATA_KEY, target) as AnyInterceptorToken[] | undefined)) ?? [];
  return existing.length ? [...existing] : [];
};

const appendInterceptorMetadata = (
  target: object,
  interceptors: AnyInterceptorToken[],
  propertyKey?: string | symbol,
): void => {
  if (!interceptors.length) {
    return;
  }
  const existing = readInterceptorMetadata(target, propertyKey);
  const next = existing.length ? [...existing, ...interceptors] : [...interceptors];
  defineInterceptorMetadata(target, next, propertyKey);
};

export const UseInterceptors = (
  ...interceptors: AnyInterceptorToken[]
): ClassDecorator & MethodDecorator =>
  ((targetOrValue: unknown, context?: unknown) => {
    if (isStage3MethodContext(context)) {
      context.addInitializer(function () {
        const container = context.static ? this : Object.getPrototypeOf(this);
        if (!container) {
          return;
        }
        appendInterceptorMetadata(container as object, interceptors, context.name);
      });
      return targetOrValue as PropertyDescriptor['value'];
    }

    if (isStage3ClassContext(context)) {
      context.addInitializer(function () {
        appendInterceptorMetadata(this as object, interceptors);
      });
      return targetOrValue as new (...args: unknown[]) => unknown;
    }

    if (typeof context === 'undefined') {
      appendInterceptorMetadata(targetOrValue as object, interceptors);
      return targetOrValue as ClassDecorator;
    }

    appendInterceptorMetadata(targetOrValue as object, interceptors, context as string | symbol);
    return targetOrValue as PropertyDescriptor['value'];
  }) as ClassDecorator & MethodDecorator;

export const getInterceptorMetadata = (
  target: object,
  propertyKey?: string | symbol,
): AnyInterceptorToken[] => readInterceptorMetadata(target, propertyKey);

export const listAppliedInterceptors = <T = InterceptorToken>(
  controller: object,
  handlerName?: string | symbol,
): T[] => {
  const interceptors: AnyInterceptorToken[] = [];
  const dedupe = <K>(items: K[]): K[] => {
    const result: K[] = [];
    const seen = new Set<K>();
    for (const item of items) {
      if (!seen.has(item)) {
        seen.add(item);
        result.push(item);
      }
    }
    return result;
  };

  const appendFromTarget = (target: object | null | undefined, propertyKey?: string | symbol): void => {
    if (!target) {
      return;
    }
    const visited = new Set<object>();
    let current: object | null = target;
    while (current && !visited.has(current)) {
      visited.add(current);
      const metadata = readInterceptorMetadata(current, propertyKey);
      if (metadata.length) {
        interceptors.push(...metadata);
      }
      current = Object.getPrototypeOf(current);
    }
  };

  if (typeof controller === 'function') {
    appendFromTarget(controller);
    if ('prototype' in controller) {
      appendFromTarget(controller.prototype);
    }
    if (handlerName !== undefined) {
      appendFromTarget(controller, handlerName);
      if ('prototype' in controller) {
        appendFromTarget(controller.prototype, handlerName);
      }
    }
  } else if (controller && typeof controller === 'object') {
    appendFromTarget(controller);
    if (handlerName !== undefined) {
      appendFromTarget(controller, handlerName);
    }
  }

  return dedupe(interceptors) as T[];
};

export { INTERCEPTORS_METADATA_KEY };
