import 'reflect-metadata';
import type { ClassType } from '@nl-framework/core';
import {
  GraphqlMetadataStorage,
  type ResolverMethodOptions,
  type ResolverParamOptions,
  type ResolverParamKind,
  type TypeThunk,
} from '../internal/metadata';

const storage = GraphqlMetadataStorage.get();

export const Resolver = (objectType?: TypeThunk): ClassDecorator => (target) => {
  storage.upsertResolver(target as unknown as ClassType, objectType);
};

const createMethodDecorator = (
  kind: 'query' | 'mutation' | 'field',
) =>
  (typeThunk?: TypeThunk, options: ResolverMethodOptions = {}): MethodDecorator =>
  (target, propertyKey) => {
    const designReturnType = Reflect.getMetadata('design:returntype', target, propertyKey);
    storage.addResolverMethod({
      kind,
      target: (target as any).constructor as ClassType,
      methodName: String(propertyKey),
      schemaName: options.name ?? String(propertyKey),
      typeThunk,
      designReturnType,
      options,
    });
  };

export const Query = createMethodDecorator('query');
export const Mutation = createMethodDecorator('mutation');
export const ResolveField = createMethodDecorator('field');

export const ResolveReference = (typeThunk?: TypeThunk): MethodDecorator => (
  target,
  propertyKey,
) => {
  const designReturnType = Reflect.getMetadata('design:returntype', target, propertyKey);
  storage.setResolveReference({
    kind: 'field',
    target: (target as any).constructor as ClassType,
    methodName: String(propertyKey),
    schemaName: '__resolveReference',
    typeThunk,
    designReturnType,
    options: {},
  });
};

const createParamDecorator = (kind: ResolverParamKind) =>
  (
    nameOrType?: string | TypeThunk,
    maybeTypeOrOptions?: TypeThunk | ResolverParamOptions,
    maybeOptions?: ResolverParamOptions,
  ): ParameterDecorator =>
  (target, propertyKey, parameterIndex) => {
    if (propertyKey === undefined) {
      throw new Error('GraphQL parameter decorators can only be used on methods.');
    }

    let name: string | undefined;
    let typeThunk: TypeThunk | undefined;
    let options: ResolverParamOptions | undefined;

    if (typeof nameOrType === 'string') {
      name = nameOrType;
      if (typeof maybeTypeOrOptions === 'function') {
        typeThunk = maybeTypeOrOptions as TypeThunk;
        options = maybeOptions;
      } else {
        options = maybeTypeOrOptions as ResolverParamOptions | undefined;
      }
    } else if (typeof nameOrType === 'function') {
      typeThunk = nameOrType as TypeThunk;
      options = maybeTypeOrOptions as ResolverParamOptions | undefined;
    } else {
      options = maybeTypeOrOptions as ResolverParamOptions | undefined;
    }

    const resolverKey = propertyKey as string | symbol;
    const paramTypes = Reflect.getMetadata('design:paramtypes', target, resolverKey) as
      | unknown[]
      | undefined;
    const designType = paramTypes?.[parameterIndex];

    storage.addResolverParam({
      target: (target as any).constructor as ClassType,
      methodName: String(resolverKey),
      index: parameterIndex,
      kind,
      name,
      typeThunk,
      designType,
      options: options ?? {},
    });
  };

export const Arg = createParamDecorator('arg');
const ArgsDecorator = createParamDecorator('args');

export const Args = (
  nameOrType?: string | TypeThunk,
  maybeTypeOrOptions?: TypeThunk | ResolverParamOptions,
  maybeOptions?: ResolverParamOptions,
): ParameterDecorator => {
  if (typeof nameOrType === 'string') {
    return Arg(nameOrType, maybeTypeOrOptions, maybeOptions);
  }

  return ArgsDecorator(nameOrType, maybeTypeOrOptions, maybeOptions);
};
export const Context = createParamDecorator('context');
export const Parent = createParamDecorator('parent');
export const Info = createParamDecorator('info');
