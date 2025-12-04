import 'reflect-metadata';
import { isStage3ClassContext, isStage3MethodContext } from './metadata-helpers';

export type GuardToken = unknown;

const GUARDS_METADATA_KEY = Symbol.for('nl:http:guards:metadata');

const defineGuardMetadata = (
  target: object,
  value: GuardToken[],
  propertyKey?: string | symbol,
): void => {
  if (propertyKey !== undefined) {
    Reflect.defineMetadata(GUARDS_METADATA_KEY, value, target, propertyKey);
    return;
  }
  Reflect.defineMetadata(GUARDS_METADATA_KEY, value, target);
};

const readGuardMetadata = (target: object, propertyKey?: string | symbol): GuardToken[] => {
  const existing =
    (propertyKey !== undefined
      ? (Reflect.getMetadata(GUARDS_METADATA_KEY, target, propertyKey) as GuardToken[] | undefined)
      : (Reflect.getMetadata(GUARDS_METADATA_KEY, target) as GuardToken[] | undefined)) ?? [];
  return existing.length ? [...existing] : [];
};

const appendGuardMetadata = (
  target: object,
  guards: GuardToken[],
  propertyKey?: string | symbol,
): void => {
  if (!guards.length) {
    return;
  }
  const existing = readGuardMetadata(target, propertyKey);
  const next = existing.length ? [...existing, ...guards] : [...guards];
  defineGuardMetadata(target, next, propertyKey);
};

export const UseGuards = (...guards: GuardToken[]): ClassDecorator & MethodDecorator =>
  ((targetOrValue: unknown, context?: unknown) => {
    if (isStage3MethodContext(context)) {
      context.addInitializer(function () {
        const container = context.static ? this : Object.getPrototypeOf(this);
        if (!container) {
          return;
        }
        appendGuardMetadata(container as object, guards, context.name);
      });
      return targetOrValue as PropertyDescriptor['value'];
    }

    if (isStage3ClassContext(context)) {
      context.addInitializer(function () {
        appendGuardMetadata(this as object, guards);
      });
      return targetOrValue as new (...args: unknown[]) => unknown;
    }

    if (typeof context === 'undefined') {
      appendGuardMetadata(targetOrValue as object, guards);
      return targetOrValue as ClassDecorator;
    }

    appendGuardMetadata(targetOrValue as object, guards, context as string | symbol);
    return targetOrValue as PropertyDescriptor['value'];
  }) as ClassDecorator & MethodDecorator;

export const getGuardMetadata = (target: object, propertyKey?: string | symbol): GuardToken[] =>
  readGuardMetadata(target, propertyKey);

export const listAppliedGuards = <T = GuardToken>(
  controller: object,
  handlerName?: string | symbol,
): T[] => {
  const guards: GuardToken[] = [];
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
      const metadata = readGuardMetadata(current, propertyKey);
      if (metadata.length) {
        guards.push(...metadata);
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

  return dedupe(guards) as T[];
};

export { GUARDS_METADATA_KEY };
