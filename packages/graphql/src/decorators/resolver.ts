import 'reflect-metadata';
import type { ClassType } from '@nl-framework/core';
import {
  GraphqlMetadataStorage,
  type ResolverMethodOptions,
  type ResolverParamOptions,
  type ResolverParamKind,
  type TypeThunk,
  type GraphqlParamFactory,
} from '../internal/metadata';

const storage = GraphqlMetadataStorage.get();

/**
 * Marks a class as a GraphQL resolver and optionally links it to an object type.
 *
 * When no `objectType` is provided, metadata from the class decorators or reflection is used.
 * Supplying a thunk allows lazy resolution of the GraphQL type to avoid circular imports.
 */
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

/**
 * Declares a GraphQL query resolver method.
 *
 * By default the schema name matches the method name; pass `options.name` to override it and
 * provide a thunk to describe the return type when reflection metadata is insufficient.
 */
export const Query = createMethodDecorator('query');
/**
 * Declares a GraphQL mutation resolver method.
 *
 * Accepts the same signature as {@link Query}; the resulting field is added under the schema's
 * `Mutation` root instead of `Query`.
 */
export const Mutation = createMethodDecorator('mutation');
/**
 * Declares a field resolver for an object type or interface.
 *
 * Useful for computed properties, relationships, or overriding default property resolution.
 */
export const ResolveField = createMethodDecorator('field');

/**
 * Registers a method that resolves a federated entity reference.
 *
 * This maps to Apollo Federation's `__resolveReference` and is invoked when a subgraph needs
 * to hydrate an entity that was returned by another service.
 */
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

/**
 * Injects a single named GraphQL argument into a resolver parameter.
 *
 * Supports optional type thunks and parameter options for transformation hooks.
 */
export const Arg = createParamDecorator('arg');
const ArgsDecorator = createParamDecorator('args');

/**
 * Injects GraphQL resolver arguments with overloads for both single named values and the full args object.
 *
 * Passing a string name mirrors {@link Arg} and extracts only that argument (e.g. `@Args('input')`).
 * Providing a type thunk or options without a name passes the entire args object and lets you describe its shape
 * (e.g. `@Args(() => CreateUserArgs)` or `@Args({ transform: true })`).
 *
 * @param nameOrType Optional argument name or type thunk describing the args object.
 * @param maybeTypeOrOptions Optional type thunk when the first parameter is the name, or parameter options.
 * @param maybeOptions Optional parameter options when both name and type thunk are supplied.
 */
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
/**
 * Provides the GraphQL execution context to the resolver.
 */
export const Context = createParamDecorator('context');
/**
 * Provides the parent object currently being resolved (useful in nested field resolvers).
 */
export const Parent = createParamDecorator('parent');
/**
 * Provides the low-level `GraphQLResolveInfo` descriptor, including field selection and schema details.
 */
export const Info = createParamDecorator('info');

export const createGraphqlParamDecorator = <Data = unknown, Result = unknown>(
  factory: GraphqlParamFactory<Data, Result>,
): ((data?: Data) => ParameterDecorator) =>
  (data?: Data) =>
    (target, propertyKey, parameterIndex) => {
      if (propertyKey === undefined) {
        throw new Error('GraphQL parameter decorators can only be used on methods.');
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
        kind: 'custom',
        designType,
        options: {},
        data,
        factory: factory as GraphqlParamFactory,
      });
    };
