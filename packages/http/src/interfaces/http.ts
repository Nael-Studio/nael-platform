import type { ClassType, Token } from '@nl-framework/core';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS' | 'HEAD';

export interface RouteDefinition {
  method: HttpMethod;
  path: string;
  handlerName: string;
  versions?: string[];
}

export interface ControllerDefinition {
  prefix: string;
  controller: ClassType;
  routes: RouteDefinition[];
}

export interface ResolvedRouteInfo {
  controller: ClassType;
  handlerName: string;
  definition: RouteDefinition;
}

export type MiddlewareHandler = (
  ctx: RequestContext,
  next: () => Promise<Response>,
) => Promise<Response> | Response;

export interface RequestContext {
  request: Request;
  params: Record<string, string>;
  query: URLSearchParams;
  headers: Headers;
  body: unknown;
  version?: string;
  route: ResolvedRouteInfo;
  container: {
    resolve<T>(token: Token<T>): Promise<T>;
  };
}
