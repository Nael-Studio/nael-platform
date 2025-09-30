import 'reflect-metadata';
import { parse, type DocumentNode, GraphQLError } from 'graphql';
import type { ClassType, Token } from '@nl-framework/core';
import {
  listAppliedGuards,
  PUBLIC_ROUTE_METADATA_KEY,
  isGuardClassToken as isHttpGuardClassToken,
  type GuardToken,
} from '@nl-framework/http';
import {
  GraphqlMetadataStorage,
  type FieldDefinition,
  type ObjectTypeDefinition,
  type ResolverClassDefinition,
  type ResolverMethodDefinition,
  type ResolverParamDefinition,
} from './internal/metadata';
import { resolveTypeReference, renderGraphqlType } from './internal/type-helpers';
import { listGraphqlGuards } from './guards/registry';
import { createGraphqlGuardExecutionContext } from './guards/execution-context';
import type { GraphqlExecutionContext } from './guards/types';

export interface FederationBuildOptions {
  enabled?: boolean;
  version?: string;
}

export interface GraphqlBuildOptions {
  federation?: FederationBuildOptions;
  guards?: GraphqlGuardRuntimeOptions;
}

export interface GraphqlBuildArtifacts {
  typeDefs: string;
  document: DocumentNode;
  resolvers: Record<string, any>;
  usedFederationDirectives: Set<string>;
}

const BUILT_IN_TYPES = new Set(['String', 'Float', 'Int', 'Boolean', 'ID']);

export interface GraphqlGuardRuntimeOptions {
  resolve<T>(token: Token<T>): Promise<T>;
}

const isGraphqlGuardFunction = (
  token: unknown,
): token is (context: GraphqlExecutionContext) => unknown =>
  typeof token === 'function' && !isHttpGuardClassToken(token as GuardToken);

const isPublicResolver = (target: ClassType, handlerName: string): boolean => {
  const prototypes: Array<object | undefined> = [target, (target as { prototype?: object }).prototype];

  for (const proto of prototypes) {
    if (!proto) {
      continue;
    }

    if (Reflect.getMetadata(PUBLIC_ROUTE_METADATA_KEY, proto, handlerName)) {
      return true;
    }

    if (Reflect.getMetadata(PUBLIC_ROUTE_METADATA_KEY, proto)) {
      return true;
    }
  }

  return false;
};

const readResponseMessage = async (response: Response): Promise<string> => {
  try {
    const clone = response.clone();
    const contentType = clone.headers.get('content-type') ?? '';
    const payload = await clone.text();
    if (!payload) {
      return response.statusText || `HTTP ${response.status}`;
    }

    if (contentType.includes('application/json')) {
      try {
        const data = JSON.parse(payload) as { message?: string };
        if (typeof data?.message === 'string' && data.message.length > 0) {
          return data.message;
        }
      } catch {
        // fall through to raw payload
      }
    }

    return payload;
  } catch {
    return response.statusText || `HTTP ${response.status}`;
  }
};

const responseToGraphQLError = async (response: Response): Promise<GraphQLError> => {
  const message = await readResponseMessage(response);
  return new GraphQLError(message || 'Unauthorized', {
    extensions: {
      http: {
        status: response.status,
      },
    },
  });
};

const formatDescription = (description?: string): string => {
  if (!description) {
    return '';
  }

  const escaped = description.replace(/"""/g, '\u0022\u0022\u0022');
  return `"""\n${escaped}\n"""\n`;
};

const formatDefaultValue = (value: unknown): string | undefined => {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value === 'string') {
    return `\"${value}\"`;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (Array.isArray(value)) {
    const items = value.map((item) => formatDefaultValue(item) ?? 'null');
    return `[${items.join(', ')}]`;
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return undefined;
};

const ensureTypeName = (definition: ObjectTypeDefinition): string =>
  definition.name ?? definition.target.name;

const ensureUniqueFieldName = (fields: FieldDefinition[]): void => {
  const seen = new Map<string, FieldDefinition>();
  for (const field of fields) {
    if (seen.has(field.name)) {
      throw new Error(
        `Duplicate GraphQL field name "${field.name}" detected on ${field.target.name}. ` +
          'Use the name option to disambiguate.',
      );
    }
    seen.set(field.name, field);
  }
};

const recordFederationDirective = (
  directives: Set<string>,
  name: string,
  condition: boolean,
): void => {
  if (condition) {
    directives.add(name);
  }
};

const invokeGraphqlGuard = async (
  guard: unknown,
  executionContext: GraphqlExecutionContext,
  runtime: GraphqlGuardRuntimeOptions,
) => {
  if (isGraphqlGuardFunction(guard)) {
    return (guard as (context: GraphqlExecutionContext) => unknown | Promise<unknown>)(
      executionContext,
    );
  }

  if (isHttpGuardClassToken(guard as GuardToken)) {
    const instance = await runtime.resolve(guard as Token<unknown>);
    if (!instance || typeof (instance as { canActivate?: unknown }).canActivate !== 'function') {
      throw new Error('Resolved GraphQL guard does not implement canActivate');
    }

    return (instance as { canActivate: (context: GraphqlExecutionContext) => unknown | Promise<unknown> }).canActivate(
      executionContext,
    );
  }

  return undefined;
};

const createResolverInvoker = (
  resolver: unknown,
  method: ResolverMethodDefinition,
  params: ResolverParamDefinition[],
  guardRuntime?: GraphqlGuardRuntimeOptions,
): ((parent: unknown, args: any, context: any, info: any) => unknown | Promise<unknown>) => {
  const instance = resolver as Record<string, any>;
  const handler = instance[method.methodName];
  if (typeof handler !== 'function') {
    throw new Error(`Resolver method ${method.target.name}.${method.methodName} not found at runtime.`);
  }

  const sortedParams = [...params].sort((a, b) => a.index - b.index);

  const invokeHandler = (parent: unknown, args: any, context: any, info: any) => {
    if (!sortedParams.length) {
      const fallbackArgs = [parent, args, context, info];
      return handler.apply(instance, fallbackArgs.slice(0, handler.length));
    }

    const actualArgs: unknown[] = [];
    for (const param of sortedParams) {
      switch (param.kind) {
        case 'arg': {
          if (!param.name) {
            throw new Error(
              `Argument decorator on ${method.target.name}.${method.methodName} is missing a name`,
            );
          }
          actualArgs.push(args?.[param.name]);
          break;
        }
        case 'context':
          actualArgs.push(context);
          break;
        case 'info':
          actualArgs.push(info);
          break;
        case 'parent':
          actualArgs.push(parent);
          break;
        case 'args':
          actualArgs.push(args);
          break;
        default:
          actualArgs.push(undefined);
          break;
      }
    }
    return handler.apply(instance, actualArgs);
  };

  return async (parent: unknown, args: any, context: any, info: any) => {
    if (guardRuntime) {
      const guardTokens = [
        ...listGraphqlGuards(),
        ...listAppliedGuards(method.target, method.methodName),
      ];

      if (guardTokens.length && !isPublicResolver(method.target, method.methodName)) {
        const executionContext = createGraphqlGuardExecutionContext({
          parent,
          args: (args ?? {}) as Record<string, unknown>,
          context,
          info,
          resolverClass: method.target,
          resolverHandlerName: method.methodName,
          resolve: guardRuntime.resolve,
        });

        for (const guard of guardTokens) {
          const decision = await invokeGraphqlGuard(guard, executionContext, guardRuntime);
          if (decision instanceof Response) {
            throw await responseToGraphQLError(decision);
          }
          if (decision === false) {
            throw new GraphQLError('Forbidden', {
              extensions: {
                http: {
                  status: 403,
                },
              },
            });
          }
        }
      }
    }

    return invokeHandler(parent, args, context, info);
  };
};

export class GraphqlSchemaBuilder {
  constructor(private readonly storage = GraphqlMetadataStorage.get()) {}

  build(resolverInstances: unknown[], options: GraphqlBuildOptions = {}): GraphqlBuildArtifacts {
    const resolverMap = new Map<ClassType, unknown>();
    for (const instance of resolverInstances) {
      if (!instance) {
        continue;
      }
      resolverMap.set((instance as any).constructor as ClassType, instance);
    }

    const guardRuntime = options.guards;

    const objectTypes = this.storage.getObjectTypes();
    const inputTypes = this.storage.getInputTypes();
    const resolverClasses = this.storage
      .getResolverClasses()
      .filter((resolver) => resolverMap.has(resolver.target));

    objectTypes.forEach((definition) => ensureUniqueFieldName(definition.fields));
    inputTypes.forEach((definition) => ensureUniqueFieldName(definition.fields));

    const federationDirectives = new Set<string>();
    const usedCustomScalars = new Set<string>();

    const typeSections: string[] = [];

    for (const input of inputTypes) {
      const typeName = ensureTypeName(input);
      const lines: string[] = [];
      const description = formatDescription(input.description);
      if (description) {
        lines.push(description.trimEnd());
      }
      lines.push(`input ${typeName} {`);
      for (const field of input.fields) {
        lines.push(this.renderFieldDefinition(field, usedCustomScalars, { withinInput: true }));
      }
      lines.push('}');
      typeSections.push(lines.join('\n'));
    }

    for (const objectType of objectTypes) {
      const typeName = ensureTypeName(objectType);
      const lines: string[] = [];
      const description = formatDescription(objectType.description);
      if (description) {
        lines.push(description.trimEnd());
      }

      const prefix = objectType.federation?.extend ? 'extend type' : 'type';
      const directives: string[] = objectType.directives?.slice() ?? [];

      if (objectType.federation?.keyFields) {
        for (const key of objectType.federation.keyFields) {
          const keyArgs = [`fields: \"${key}\"`];
          if (objectType.federation.resolvable === false) {
            keyArgs.push('resolvable: false');
          }
          directives.push(`@key(${keyArgs.join(', ')})`);
          recordFederationDirective(federationDirectives, '@key', true);
        }
      }

      if (objectType.federation?.shareable) {
        directives.push('@shareable');
        recordFederationDirective(federationDirectives, '@shareable', true);
      }

      if (objectType.federation?.interfaceObject) {
        directives.push('@interfaceObject');
        recordFederationDirective(federationDirectives, '@interfaceObject', true);
      }

      if (objectType.federation?.tags) {
        for (const tag of objectType.federation.tags) {
          directives.push(`@tag(name: \"${tag}\")`);
          recordFederationDirective(federationDirectives, '@tag', true);
        }
      }

      const header = directives.length
        ? `${prefix} ${typeName} ${directives.join(' ')} {`
        : `${prefix} ${typeName} {`;
      lines.push(header);

      for (const field of objectType.fields) {
        lines.push(this.renderFieldDefinition(field, usedCustomScalars, { withinInput: false, federationDirectives }));
      }

      lines.push('}');
      typeSections.push(lines.join('\n'));
    }

    const queryFields: string[] = [];
    const mutationFields: string[] = [];
    const rootQueryResolvers: Record<string, any> = {};
    const rootMutationResolvers: Record<string, any> = {};
    const typeResolvers: Record<string, Record<string, any>> = {};

    for (const resolver of resolverClasses) {
      const instance = resolverMap.get(resolver.target)!;
      const objectTarget = resolver.objectTypeThunk?.() as ClassType | undefined;
      const objectDefinition = objectTarget
        ? this.storage.getObjectTypeDefinition(objectTarget)
        : undefined;
      const objectTypeName = objectDefinition?.name ?? objectTarget?.name;

      for (const method of resolver.queries) {
        queryFields.push(this.renderOperationDefinition('  ', method, usedCustomScalars));
        rootQueryResolvers[method.schemaName] = createResolverInvoker(
          instance,
          method,
          this.storage.getResolverParams(resolver.target, method.methodName),
          guardRuntime,
        );
      }

      for (const method of resolver.mutations) {
        mutationFields.push(this.renderOperationDefinition('  ', method, usedCustomScalars));
        rootMutationResolvers[method.schemaName] = createResolverInvoker(
          instance,
          method,
          this.storage.getResolverParams(resolver.target, method.methodName),
          guardRuntime,
        );
      }

      if (objectTypeName) {
        const fieldResolvers = (typeResolvers[objectTypeName] ??= {});
        for (const method of resolver.fields) {
          fieldResolvers[method.schemaName] = createResolverInvoker(
            instance,
            method,
            this.storage.getResolverParams(resolver.target, method.methodName),
            guardRuntime,
          );
        }

        if (resolver.resolveReference) {
          fieldResolvers.__resolveReference = createResolverInvoker(
            instance,
            resolver.resolveReference,
            this.storage.getResolverParams(resolver.target, resolver.resolveReference.methodName),
            guardRuntime,
          );
          recordFederationDirective(federationDirectives, '@key', true);
        }
      }
    }

    if (queryFields.length) {
      typeSections.push(['type Query {', ...queryFields, '}'].join('\n'));
    }
    if (mutationFields.length) {
      typeSections.push(['type Mutation {', ...mutationFields, '}'].join('\n'));
    }

    const scalarDefinitions: string[] = [];
    for (const scalarName of usedCustomScalars) {
      if (!BUILT_IN_TYPES.has(scalarName) && !objectTypes.some((t) => ensureTypeName(t) === scalarName)) {
        scalarDefinitions.push(`scalar ${scalarName}`);
      }
    }

    const parts: string[] = [];

    if (options.federation?.enabled) {
      const version = options.federation.version ?? 'https://specs.apollo.dev/federation/v2.3';
      const imports =
        federationDirectives.size > 0
          ? Array.from(federationDirectives)
              .map((directive) => `"${directive}"`)
              .join(', ')
          : '';
      const importSegment = imports ? `, import: [${imports}]` : '';
      parts.push(`extend schema @link(url: \"${version}\"${importSegment})`);
    }

    parts.push(...scalarDefinitions, ...typeSections);

    const sdl = parts.join('\n\n');

    const resolvers: Record<string, any> = {};
    if (queryFields.length) {
      resolvers.Query = rootQueryResolvers;
    }
    if (mutationFields.length) {
      resolvers.Mutation = rootMutationResolvers;
    }
    for (const [typeName, resolver] of Object.entries(typeResolvers)) {
      resolvers[typeName] = resolver;
    }

    return {
      typeDefs: sdl,
      document: parse(sdl),
      resolvers,
      usedFederationDirectives: federationDirectives,
    };
  }

  private renderFieldDefinition(
    field: FieldDefinition,
    customScalars: Set<string>,
    context: { withinInput: boolean; federationDirectives?: Set<string> },
  ): string {
    const resolution = resolveTypeReference(field.typeThunk, field.designType);
    if (!BUILT_IN_TYPES.has(resolution.typeName)) {
      customScalars.add(resolution.typeName);
    }

    const typeExpression = renderGraphqlType(resolution, {
      nullable: field.options.nullable,
      list: field.options.list,
    });

    const description = formatDescription(field.options.description);
    const parts: string[] = [];
    if (description) {
      parts.push(description.trimEnd());
    }

    const args: string[] = [];
    if (field.options.defaultValue !== undefined) {
      const defaultValue = formatDefaultValue(field.options.defaultValue);
      if (defaultValue) {
        args.push(`= ${defaultValue}`);
      }
    }

    const directives: string[] = [];
    if (field.options.deprecationReason) {
      directives.push(`@deprecated(reason: \"${field.options.deprecationReason}\")`);
    }

    if (!context.withinInput && field.options.federation) {
      const federation = field.options.federation;
      if (federation.external) {
        directives.push('@external');
        context.federationDirectives?.add('@external');
      }
      if (federation.provides) {
        directives.push(`@provides(fields: \"${federation.provides}\")`);
        context.federationDirectives?.add('@provides');
      }
      if (federation.requires) {
        directives.push(`@requires(fields: \"${federation.requires}\")`);
        context.federationDirectives?.add('@requires');
      }
      if (federation.shareable) {
        directives.push('@shareable');
        context.federationDirectives?.add('@shareable');
      }
      if (federation.overrideFrom) {
        directives.push(`@override(from: \"${federation.overrideFrom}\")`);
        context.federationDirectives?.add('@override');
      }
      if (federation.tags) {
        for (const tag of federation.tags) {
          directives.push(`@tag(name: \"${tag}\")`);
          context.federationDirectives?.add('@tag');
        }
      }
    }

    const line = [`${field.name}: ${typeExpression}`, ...args, ...directives].join(' ');
    parts.push(`  ${line.trim()}`);
    return parts.join('\n');
  }

  private renderOperationDefinition(
    indent: string,
    method: ResolverMethodDefinition,
    customScalars: Set<string>,
  ): string {
    const resolution = resolveTypeReference(method.typeThunk, method.designReturnType);
    if (!BUILT_IN_TYPES.has(resolution.typeName)) {
      customScalars.add(resolution.typeName);
    }
    const typeExpression = renderGraphqlType(resolution, {
      nullable: method.options.nullable,
      list: method.options.list,
    });

    const params = this.storage.getResolverParams(method.target, method.methodName);
    const argParts: string[] = [];
    for (const param of params) {
      if (param.kind !== 'arg') {
        continue;
      }
      if (!param.name) {
        throw new Error(
          `@Arg missing name on parameter ${param.index} of ${method.target.name}.${method.methodName}`,
        );
      }
      const argResolution = resolveTypeReference(param.typeThunk, param.designType);
      if (!BUILT_IN_TYPES.has(argResolution.typeName)) {
        customScalars.add(argResolution.typeName);
      }
      const argType = renderGraphqlType(argResolution, {
        nullable: param.options.nullable,
        list: param.options.list,
      });
      const defaultValue = formatDefaultValue(param.options.defaultValue);
      argParts.push(
        defaultValue ? `${param.name}: ${argType} = ${defaultValue}` : `${param.name}: ${argType}`,
      );
    }

    const description = formatDescription(method.options.description);
    const directives: string[] = [];
    if (method.options.deprecationReason) {
      directives.push(`@deprecated(reason: \"${method.options.deprecationReason}\")`);
    }

    const argsSegment = argParts.length ? `(${argParts.join(', ')})` : '';
    const directiveSegment = directives.length ? ` ${directives.join(' ')}` : '';

    const lines: string[] = [];
    if (description) {
      lines.push(`${indent}${description.trimEnd().replace(/\n/g, `\n${indent}`)}`);
    }
    lines.push(`${indent}${method.schemaName}${argsSegment}: ${typeExpression}${directiveSegment}`);

    return lines.join('\n');
  }
}
