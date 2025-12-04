import { setMetadata } from '../utils/metadata';

export type CustomDecorator = ClassDecorator & MethodDecorator & PropertyDecorator;

type Stage3MemberContext = {
  kind: 'method' | 'field' | 'accessor' | 'getter' | 'setter';
  name: string | symbol;
  static: boolean;
  addInitializer(initializer: (this: unknown) => void): void;
};

type Stage3ClassContext = {
  kind: 'class';
  addInitializer(initializer: (this: unknown) => void): void;
};

const isStage3MemberContext = (value: unknown): value is Stage3MemberContext =>
  typeof value === 'object' && value !== null &&
  typeof (value as Stage3MemberContext).addInitializer === 'function' &&
  typeof (value as Stage3MemberContext).kind === 'string' &&
  'name' in (value as Stage3MemberContext);

const isStage3ClassContext = (value: unknown): value is Stage3ClassContext =>
  typeof value === 'object' && value !== null && (value as Stage3ClassContext).kind === 'class';

const defineMetadataForTarget = (
  key: unknown,
  value: unknown,
  target: object,
  propertyKey?: string | symbol,
): void => {
  setMetadata(key, value, target, propertyKey);
};

const bindStage3Initializer = (
  context: Stage3MemberContext,
  key: unknown,
  value: unknown,
): void => {
  context.addInitializer(function () {
    const container = context.static ? this : Object.getPrototypeOf(this);
    if (!container) {
      return;
    }
    defineMetadataForTarget(key, value, container as object, context.name);
  });
};

export const SetMetadata = <K = unknown, V = unknown>(
  key: K,
  value: V,
): CustomDecorator =>
  ((targetOrValue: unknown, context?: unknown) => {
    if (isStage3MemberContext(context)) {
      bindStage3Initializer(context, key, value);
      return targetOrValue as PropertyDescriptor['value'];
    }

    if (isStage3ClassContext(context)) {
      context.addInitializer(function () {
        defineMetadataForTarget(key, value, this as object);
      });
      return targetOrValue as new (...args: unknown[]) => unknown;
    }

    if (typeof context === 'undefined') {
      defineMetadataForTarget(key, value, targetOrValue as object);
      return targetOrValue as ClassDecorator;
    }

    defineMetadataForTarget(key, value, targetOrValue as object, context as string | symbol);
    return targetOrValue as PropertyDescriptor['value'];
  }) as CustomDecorator;
