import type { GraphqlInterceptorToken } from './types';
import { markInterceptorToken } from '@nl-framework/http';

const GLOBAL_GRAPHQL_INTERCEPTORS = Symbol.for('nl:graphql:interceptors');

type GraphqlInterceptorRegistry = {
  [GLOBAL_GRAPHQL_INTERCEPTORS]?: GraphqlInterceptorToken[];
};

const getRegistry = (): GraphqlInterceptorRegistry => globalThis as GraphqlInterceptorRegistry;

export const registerGraphqlInterceptor = (interceptor: GraphqlInterceptorToken): void => {
  markInterceptorToken(interceptor);
  const registry = getRegistry();
  const existing = registry[GLOBAL_GRAPHQL_INTERCEPTORS];

  if (existing) {
    existing.push(interceptor);
    return;
  }

  registry[GLOBAL_GRAPHQL_INTERCEPTORS] = [interceptor];
};

export const registerGraphqlInterceptors = (
  ...interceptors: GraphqlInterceptorToken[]
): void => {
  for (const interceptor of interceptors) {
    registerGraphqlInterceptor(interceptor);
  }
};

export const listGraphqlInterceptors = (): GraphqlInterceptorToken[] => {
  const registry = getRegistry();
  return [...(registry[GLOBAL_GRAPHQL_INTERCEPTORS] ?? [])];
};

export const clearGraphqlInterceptors = (): void => {
  const registry = getRegistry();
  if (registry[GLOBAL_GRAPHQL_INTERCEPTORS]) {
    delete registry[GLOBAL_GRAPHQL_INTERCEPTORS];
  }
};
