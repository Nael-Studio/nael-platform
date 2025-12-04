import 'reflect-metadata';

const VERSION_METADATA_KEY = Symbol.for('nl:http:version');

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

const normalizeVersions = (versions: (string | number)[]): string[] => {
  const normalized = versions
    .map((v) => String(v).trim())
    .filter((v) => v.length > 0);
  return Array.from(new Set(normalized));
};

const defineVersionMetadata = (
  target: object,
  versions: string[],
  propertyKey?: string | symbol,
): void => {
  if (propertyKey !== undefined) {
    Reflect.defineMetadata(VERSION_METADATA_KEY, versions, target, propertyKey);
    return;
  }
  Reflect.defineMetadata(VERSION_METADATA_KEY, versions, target);
};

const readVersionMetadata = (target: object, propertyKey?: string | symbol): string[] | undefined => {
  if (propertyKey !== undefined) {
    return Reflect.getMetadata(VERSION_METADATA_KEY, target, propertyKey) as string[] | undefined;
  }
  return Reflect.getMetadata(VERSION_METADATA_KEY, target) as string[] | undefined;
};

const readFromPrototypeChain = (
  target: object | null | undefined,
  propertyKey?: string | symbol,
): string[] | undefined => {
  const visited = new Set<object>();
  let current: object | null | undefined = target;
  while (current && !visited.has(current)) {
    visited.add(current);
    const versions = readVersionMetadata(current, propertyKey);
    if (versions && versions.length) {
      return versions;
    }
    current = Object.getPrototypeOf(current);
  }
  return undefined;
};

/**
 * Mark a controller or handler with supported API versions.
 */
export const Version = (
  ...versions: Array<string | number>
): ClassDecorator & MethodDecorator =>
  ((targetOrValue: unknown, context?: unknown) => {
    const normalized = normalizeVersions(versions);
    if (!normalized.length) {
      return targetOrValue as any;
    }

    if (isStage3MethodContext(context)) {
      context.addInitializer(function () {
        const container = context.static ? this : Object.getPrototypeOf(this);
        if (!container) {
          return;
        }
        defineVersionMetadata(container as object, normalized, context.name);
      });
      return targetOrValue as PropertyDescriptor['value'];
    }

    if (isStage3ClassContext(context)) {
      context.addInitializer(function () {
        defineVersionMetadata(this as object, normalized);
      });
      return targetOrValue as new (...args: unknown[]) => unknown;
    }

    if (typeof context === 'undefined') {
      defineVersionMetadata(targetOrValue as object, normalized);
      return targetOrValue as ClassDecorator;
    }

    defineVersionMetadata(targetOrValue as object, normalized, context as string | symbol);
    return targetOrValue as PropertyDescriptor['value'];
  }) as ClassDecorator & MethodDecorator;

/**
 * Get versions declared on handler (method) or class via @Version.
 */
export const getDeclaredVersions = (
  target: object,
  propertyKey?: string | symbol,
): string[] | undefined => readFromPrototypeChain(target, propertyKey);
