import {
  getControllerPrefix,
  getHandlerPipes,
  listAppliedFilters,
  listAppliedGuards,
  listAppliedInterceptors,
  type ClassType,
  type DiscoveryService,
} from '@nl-framework/core';
import { getRouteDefinitions } from '@nl-framework/http';
import { GraphqlMetadataStorage } from '@nl-framework/graphql';

export type EndpointKind = 'http' | 'graphql';
export type GraphqlOperation = 'query' | 'mutation' | 'subscription';

export interface EndpointDescriptor {
  kind: EndpointKind;
  /** HTTP verb — only for `kind: 'http'`. */
  method?: string;
  /** Full HTTP path (controller prefix + route) — only for `kind: 'http'`. */
  path?: string;
  /** GraphQL root operation — only for `kind: 'graphql'`. */
  operation?: GraphqlOperation;
  /** GraphQL schema field name — only for `kind: 'graphql'`. */
  field?: string;
  /** Declaring controller / resolver class name. */
  controller: string;
  /** Handler method name. */
  handler: string;
  guards: string[];
  interceptors: string[];
  pipes: string[];
  filters: string[];
}

export interface RouteCatalog {
  endpoints: EndpointDescriptor[];
  stats: {
    http: number;
    graphql: number;
    guarded: number;
  };
}

/** Human-readable label for a guard/interceptor/pipe/filter token. */
const tokenLabel = (token: unknown): string => {
  if (typeof token === 'function') {
    return token.name || 'anonymous';
  }
  if (token && typeof token === 'object') {
    const ctor = (token as { constructor?: { name?: string } }).constructor;
    return ctor?.name && ctor.name !== 'Object' ? ctor.name : 'instance';
  }
  if (typeof token === 'symbol') {
    return token.description ?? token.toString();
  }
  return String(token as string | number | boolean | null | undefined);
};

const labels = (tokens: unknown[]): string[] => tokens.map(tokenLabel);

/** Join a controller prefix and a route path into a single normalized path. */
const joinPath = (prefix: string, path: string): string => {
  const segments = `${prefix}/${path}`
    .split('/')
    .filter((segment) => segment.length > 0);
  return `/${segments.join('/')}`;
};

const collectFor = (
  metatype: ClassType,
  handler: string,
): Pick<EndpointDescriptor, 'guards' | 'interceptors' | 'pipes' | 'filters'> => ({
  // `listApplied*` walk the class + prototype + handler, so pass the class.
  guards: labels(listAppliedGuards(metatype, handler)),
  interceptors: labels(listAppliedInterceptors(metatype, handler)),
  // `getHandlerPipes` reads method metadata off the prototype and derives the
  // class from `target.constructor`, so it must be given the prototype.
  pipes: labels(getHandlerPipes(metatype.prototype as object, handler)),
  filters: labels(listAppliedFilters(metatype, handler)),
});

interface GraphqlResolverMethod {
  methodName: string;
  schemaName: string;
}
interface GraphqlResolverClass {
  target: ClassType;
  queries: GraphqlResolverMethod[];
  mutations: GraphqlResolverMethod[];
  subscriptions: GraphqlResolverMethod[];
}

/**
 * Read GraphQL resolver operations from the framework's metadata storage,
 * defensively — the graphql package may not be present/initialized, in which
 * case the routes catalog simply contains no GraphQL endpoints.
 */
const readGraphqlResolvers = (): GraphqlResolverClass[] => {
  try {
    return GraphqlMetadataStorage.get().getResolverClasses() as unknown as GraphqlResolverClass[];
  } catch {
    return [];
  }
};

/**
 * Build the route & handler catalog: every HTTP route and GraphQL operation
 * with the guard / interceptor / pipe / filter token names that wrap it.
 *
 * Pure and read-only — it reads decorator metadata only, never instantiates.
 */
export const buildRouteCatalog = (discovery: DiscoveryService): RouteCatalog => {
  const endpoints: EndpointDescriptor[] = [];

  // HTTP routes: controller prefix + each @Get/@Post/... route definition.
  for (const controller of discovery.getControllerClasses()) {
    const prefix = getControllerPrefix(controller);
    for (const route of getRouteDefinitions(controller)) {
      endpoints.push({
        kind: 'http',
        method: route.method,
        path: joinPath(prefix, route.path),
        controller: controller.name,
        handler: route.handlerName,
        ...collectFor(controller, route.handlerName),
      });
    }
  }

  // GraphQL operations: queries + mutations + subscriptions per resolver class.
  const operations: Array<[GraphqlOperation, keyof GraphqlResolverClass]> = [
    ['query', 'queries'],
    ['mutation', 'mutations'],
    ['subscription', 'subscriptions'],
  ];
  for (const resolver of readGraphqlResolvers()) {
    for (const [operation, bucket] of operations) {
      for (const method of resolver[bucket] as GraphqlResolverMethod[]) {
        endpoints.push({
          kind: 'graphql',
          operation,
          field: method.schemaName,
          controller: resolver.target.name,
          handler: method.methodName,
          ...collectFor(resolver.target, method.methodName),
        });
      }
    }
  }

  endpoints.sort((a, b) => {
    if (a.kind !== b.kind) {
      return a.kind === 'http' ? -1 : 1;
    }
    const aKey = a.kind === 'http' ? `${a.path} ${a.method}` : `${a.operation} ${a.field}`;
    const bKey = b.kind === 'http' ? `${b.path} ${b.method}` : `${b.operation} ${b.field}`;
    return aKey.localeCompare(bKey);
  });

  return {
    endpoints,
    stats: {
      http: endpoints.filter((e) => e.kind === 'http').length,
      graphql: endpoints.filter((e) => e.kind === 'graphql').length,
      guarded: endpoints.filter((e) => e.guards.length > 0).length,
    },
  };
};
