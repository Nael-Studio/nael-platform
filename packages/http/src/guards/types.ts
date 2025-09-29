import type { ClassType, Token } from '@nl-framework/core';
import type { RequestContext, ResolvedRouteInfo } from '../interfaces/http';

export type GuardDecision = void | boolean | Response;

export interface HttpExecutionContext {
  readonly context: RequestContext;
  getRequest<T extends Request = Request>(): T;
  getRoute(): ResolvedRouteInfo;
  getClass(): ClassType | undefined;
  getHandlerName(): string | undefined;
  getContainer(): RequestContext['container'];
}

export interface CanActivate {
  canActivate(context: HttpExecutionContext): GuardDecision | Promise<GuardDecision>;
}

export type GuardFunction = (context: HttpExecutionContext) => GuardDecision | Promise<GuardDecision>;

export type GuardInstance = CanActivate | GuardFunction;

export type GuardToken = Token<CanActivate> | GuardFunction;
