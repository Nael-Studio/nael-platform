import 'reflect-metadata';
import type { ClassTransformOptions } from 'class-transformer';

const SERIALIZATION_OPTIONS_METADATA_KEY = Symbol.for('nl:serialization:options');

type Stage3MethodContext = {
  kind: 'method';
  name: string | symbol;
  static: boolean;
  addInitializer(initializer: (this: unknown) => void): void;
};

type Stage3ClassContext = {
  kind: 'class';
  addInitializer(initializer: (this: unknown) => void): void;
};

const isStage3MethodContext = (value: unknown): value is Stage3MethodContext =>
  typeof value === 'object' && value !== null && (value as Stage3MethodContext).kind === 'method';

const isStage3ClassContext = (value: unknown): value is Stage3ClassContext =>
  typeof value === 'object' && value !== null && (value as Stage3ClassContext).kind === 'class';

const defineOptions = (
  target: object,
  options: ClassTransformOptions,
  propertyKey?: string | symbol,
): void => {
  if (propertyKey !== undefined) {
    Reflect.defineMetadata(SERIALIZATION_OPTIONS_METADATA_KEY, options, target, propertyKey);
    return;
  }
  Reflect.defineMetadata(SERIALIZATION_OPTIONS_METADATA_KEY, options, target);
};

const readOptions = (target: object, propertyKey?: string | symbol): ClassTransformOptions | undefined => {
  if (propertyKey !== undefined) {
    return Reflect.getMetadata(SERIALIZATION_OPTIONS_METADATA_KEY, target, propertyKey) as
      | ClassTransformOptions
      | undefined;
  }
  return Reflect.getMetadata(SERIALIZATION_OPTIONS_METADATA_KEY, target) as
    | ClassTransformOptions
    | undefined;
};

const readFromPrototypeChain = (
  target: object | null | undefined,
  propertyKey?: string | symbol,
): ClassTransformOptions | undefined => {
  const visited = new Set<object>();
  let current: object | null | undefined = target;
  while (current && !visited.has(current)) {
    visited.add(current);
    const value = readOptions(current, propertyKey);
    if (value) {
      return value;
    }
    current = Object.getPrototypeOf(current);
  }
  return undefined;
};

/**
 * Attach class-transformer options for outbound serialization on a class or handler.
 */
export const SerializeOptions = (
  options: ClassTransformOptions,
): ClassDecorator & MethodDecorator =>
  ((targetOrValue: unknown, context?: unknown) => {
    if (isStage3MethodContext(context)) {
      context.addInitializer(function () {
        const container = context.static ? this : Object.getPrototypeOf(this);
        if (!container) {
          return;
        }
        defineOptions(container as object, options, context.name);
      });
      return targetOrValue as PropertyDescriptor['value'];
    }

    if (isStage3ClassContext(context)) {
      context.addInitializer(function () {
        defineOptions(this as object, options);
      });
      return targetOrValue as new (...args: unknown[]) => unknown;
    }

    if (typeof context === 'undefined') {
      defineOptions(targetOrValue as object, options);
      return targetOrValue as ClassDecorator;
    }

    defineOptions(targetOrValue as object, options, context as string | symbol);
    return targetOrValue as PropertyDescriptor['value'];
  }) as ClassDecorator & MethodDecorator;

/**
 * Resolve serialization options for a class/handler, merging class-level options with method-level overrides.
 */
export const getSerializationOptions = (
  target: object,
  propertyKey?: string | symbol,
): ClassTransformOptions | undefined => {
  const classOptions = readFromPrototypeChain(target);
  const methodOptions =
    propertyKey !== undefined ? readFromPrototypeChain(target, propertyKey) : undefined;

  if (classOptions && methodOptions) {
    return {
      ...classOptions,
      ...methodOptions,
    };
  }

  return methodOptions ?? classOptions;
};
