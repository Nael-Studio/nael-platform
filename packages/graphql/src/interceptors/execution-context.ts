import { createGraphqlGuardExecutionContext } from '../guards/execution-context';
import type { GraphqlExecutionContext } from '../guards/types';

export type GraphqlInterceptorExecutionContext = GraphqlExecutionContext;

export const createGraphqlInterceptorExecutionContext = (
  state: Parameters<typeof createGraphqlGuardExecutionContext>[0],
): GraphqlInterceptorExecutionContext => createGraphqlGuardExecutionContext(state);
