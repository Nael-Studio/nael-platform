import type { RequestContext, ResolvedRouteInfo } from '../interfaces/http';
import type { ClassType } from '@nl-framework/core';
import type { HttpExecutionContext } from './types';

export class HttpGuardExecutionContext implements HttpExecutionContext {
  constructor(private readonly requestContext: RequestContext) {}

  get context(): RequestContext {
    return this.requestContext;
  }

  getRequest<T extends Request = Request>(): T {
    return this.requestContext.request as T;
  }

  getRoute(): ResolvedRouteInfo {
    return this.requestContext.route;
  }

  getClass(): ClassType | undefined {
    return this.requestContext.route?.controller;
  }

  getHandlerName(): string | undefined {
    return this.requestContext.route?.handlerName;
  }

  getContainer(): RequestContext['container'] {
    return this.requestContext.container;
  }
}

export const createHttpGuardExecutionContext = (context: RequestContext): HttpExecutionContext =>
  new HttpGuardExecutionContext(context);
