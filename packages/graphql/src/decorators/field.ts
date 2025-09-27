import 'reflect-metadata';
import type { ClassType } from '@nl-framework/core';
import { GraphqlMetadataStorage, type FieldOptions } from '../internal/metadata';
import type { TypeThunk } from '../internal/metadata';

const isFieldOptions = (value: unknown): value is FieldOptions =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const Field = (
  typeOrOptions?: TypeThunk | FieldOptions,
  maybeOptions: FieldOptions = {},
): PropertyDecorator => (target, propertyKey) => {
  let typeThunk: TypeThunk | undefined;
  let options: FieldOptions;

  if (typeof typeOrOptions === 'function') {
    typeThunk = typeOrOptions as TypeThunk;
    options = maybeOptions ?? {};
  } else if (isFieldOptions(typeOrOptions)) {
    typeThunk = undefined;
    options = typeOrOptions;
  } else {
    typeThunk = undefined;
    options = maybeOptions ?? {};
  }

  const storage = GraphqlMetadataStorage.get();
  const designType = Reflect.getMetadata('design:type', target, propertyKey);
  storage.addField({
    target: (target as any).constructor as ClassType,
    name: options.name ?? String(propertyKey),
    propertyKey,
    typeThunk,
    designType,
    options,
  });
};
