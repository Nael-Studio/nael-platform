import type { ClassType } from '@nl-framework/core';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS' | 'HEAD';

export interface RouteDefinition {
  method: HttpMethod;
  path: string;
  handlerName: string;
}

export interface ControllerDefinition {
  prefix: string;
  controller: ClassType;
  routes: RouteDefinition[];
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
  container: {
    resolve<T>(token: ClassType<T> | symbol | string): Promise<T>;
  };
}
