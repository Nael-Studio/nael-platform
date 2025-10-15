import type { ClassType } from '@nl-framework/core';
import { GraphqlMetadataStorage, type ObjectTypeOptions } from '../internal/metadata';

export type { ObjectTypeOptions, FederationObjectOptions } from '../internal/metadata';

const resolveOptions = (target: ClassType, options: ObjectTypeOptions = {}): ObjectTypeOptions => ({
  name: options.name ?? target.name,
  description: options.description,
  directives: options.directives,
  federation: options.federation,
  isAbstract: options.isAbstract,
});

export const ObjectType = (options: ObjectTypeOptions = {}): ClassDecorator => (target) => {
  const typed = target as unknown as ClassType;
  GraphqlMetadataStorage.get().addObjectType(typed, resolveOptions(typed, options));
};

export const InputType = (options: ObjectTypeOptions = {}): ClassDecorator => (target) => {
  const typed = target as unknown as ClassType;
  GraphqlMetadataStorage.get().addInputType(typed, resolveOptions(typed, options));
};
