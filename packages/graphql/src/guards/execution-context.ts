import type { ClassType, Token } from '@nl-framework/core';
import type { GraphQLResolveInfo } from 'graphql';
import type { GraphqlContext } from '../application';
import type { GraphqlExecutionContext } from './types';

type ResolveFn = <T>(token: Token<T>) => Promise<T>;

interface ExecutionContextState {
  parent: unknown;
  args: Record<string, unknown>;
  context: GraphqlContext;
  info: GraphQLResolveInfo;
  resolverClass?: ClassType;
  resolverHandlerName?: string;
  resolve: ResolveFn;
}

class DefaultGraphqlExecutionContext implements GraphqlExecutionContext {
  constructor(private readonly state: ExecutionContextState) {}

  get details() {
    return {
      parent: this.state.parent,
      args: this.state.args,
      context: this.state.context,
      info: this.state.info,
      resolverClass: this.state.resolverClass,
      resolverHandlerName: this.state.resolverHandlerName,
    } as const;
  }

  getContext<T extends GraphqlContext = GraphqlContext>(): T {
    return this.state.context as T;
  }

  getArgs<TArgs extends Record<string, unknown> = Record<string, unknown>>(): TArgs {
    return this.state.args as TArgs;
  }

  getInfo(): GraphQLResolveInfo {
    return this.state.info;
  }

  getParent<TParent = unknown>(): TParent {
    return this.state.parent as TParent;
  }

  getResolverClass(): ClassType | undefined {
    return this.state.resolverClass;
  }

  getResolverHandlerName(): string | undefined {
    return this.state.resolverHandlerName;
  }

  resolve<T>(token: Token<T>): Promise<T> {
    return this.state.resolve(token);
  }
}

export const createGraphqlGuardExecutionContext = (
  state: ExecutionContextState,
): GraphqlExecutionContext => new DefaultGraphqlExecutionContext(state);
