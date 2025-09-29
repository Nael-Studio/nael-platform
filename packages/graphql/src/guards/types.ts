import type { ClassType, Token } from '@nl-framework/core';
import type { GraphqlContext } from '../application';
import type { GuardToken, GuardDecision } from '@nl-framework/http';
import type { GraphQLResolveInfo } from 'graphql';

export interface GraphqlGuardExecutionDetails {
  readonly parent: unknown;
  readonly args: Record<string, unknown>;
  readonly context: GraphqlContext;
  readonly info: GraphQLResolveInfo;
  readonly resolverClass?: ClassType;
  readonly resolverHandlerName?: string;
}

export interface GraphqlExecutionContext {
  readonly details: GraphqlGuardExecutionDetails;
  getContext<T extends GraphqlContext = GraphqlContext>(): T;
  getArgs<TArgs extends Record<string, unknown> = Record<string, unknown>>(): TArgs;
  getInfo(): GraphQLResolveInfo;
  getParent<TParent = unknown>(): TParent;
  getResolverClass(): ClassType | undefined;
  getResolverHandlerName(): string | undefined;
  resolve<T>(token: Token<T>): Promise<T>;
}

export type GraphqlGuardToken = GuardToken;
export type GraphqlGuardDecision = GuardDecision;
