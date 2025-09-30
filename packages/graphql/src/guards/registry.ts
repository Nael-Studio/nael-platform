import type { GraphqlGuardToken } from './types';
import { markGuardToken } from '@nl-framework/http';

const GLOBAL_GRAPHQL_GUARDS_KEY = Symbol.for('nl:graphql:guards');

type GraphqlGlobalRegistry = typeof globalThis & {
  [GLOBAL_GRAPHQL_GUARDS_KEY]?: GraphqlGuardToken[];
};

const getRegistry = (): GraphqlGlobalRegistry => globalThis as GraphqlGlobalRegistry;

export const registerGraphqlGuard = (guard: GraphqlGuardToken): void => {
  markGuardToken(guard);
  const registry = getRegistry();
  const existing = registry[GLOBAL_GRAPHQL_GUARDS_KEY];

  if (existing) {
    existing.push(guard);
    return;
  }

  registry[GLOBAL_GRAPHQL_GUARDS_KEY] = [guard];
};

export const registerGraphqlGuards = (...guards: GraphqlGuardToken[]): void => {
  for (const guard of guards) {
    registerGraphqlGuard(guard);
  }
};

export const listGraphqlGuards = (): GraphqlGuardToken[] => {
  const registry = getRegistry();
  return [...(registry[GLOBAL_GRAPHQL_GUARDS_KEY] ?? [])];
};

export const clearGraphqlGuards = (): void => {
  const registry = getRegistry();
  if (registry[GLOBAL_GRAPHQL_GUARDS_KEY]) {
    delete registry[GLOBAL_GRAPHQL_GUARDS_KEY];
  }
};
