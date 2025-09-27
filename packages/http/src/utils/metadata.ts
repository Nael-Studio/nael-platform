import 'reflect-metadata';

type ReflectWithMetadata = typeof Reflect & {
  defineMetadata: (
    metadataKey: unknown,
    metadataValue: unknown,
    target: object,
    propertyKey?: string | symbol,
  ) => void;
  getMetadata: (
    metadataKey: unknown,
    target: object,
    propertyKey?: string | symbol,
  ) => unknown;
};

const Reflector = Reflect as ReflectWithMetadata;

export const setMetadata = (
  key: unknown,
  value: unknown,
  target: object,
  propertyKey?: string | symbol,
): void => {
  Reflector.defineMetadata(key, value, target, propertyKey);
};

export const getMetadata = (
  key: unknown,
  target: object,
  propertyKey?: string | symbol,
): unknown => Reflector.getMetadata(key, target, propertyKey);
