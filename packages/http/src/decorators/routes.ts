import type { HttpMethod, RouteDefinition } from '../interfaces/http';
import { getMetadata, setMetadata } from '../utils/metadata';

const ROUTE_METADATA_KEY = Symbol('nl:http:routes');

const appendRouteDefinition = (target: object, definition: RouteDefinition): void => {
  const existing: RouteDefinition[] =
    (getMetadata(ROUTE_METADATA_KEY, target.constructor) as RouteDefinition[]) ?? [];
  setMetadata(ROUTE_METADATA_KEY, [...existing, definition], target.constructor);
};

const createRouteDecorator = (method: HttpMethod) =>
  (path = ''): MethodDecorator => (target, propertyKey) => {
    appendRouteDefinition(target, {
      method,
      path,
      handlerName: propertyKey as string,
    });
  };

export const Get = createRouteDecorator('GET');
export const Post = createRouteDecorator('POST');
export const Put = createRouteDecorator('PUT');
export const Patch = createRouteDecorator('PATCH');
export const Delete = createRouteDecorator('DELETE');
export const Options = createRouteDecorator('OPTIONS');
export const Head = createRouteDecorator('HEAD');

export const getRouteDefinitions = (target: object): RouteDefinition[] =>
  ((getMetadata(ROUTE_METADATA_KEY, target) as RouteDefinition[]) ?? []).map((route) => ({
    ...route,
    method: route.method.toUpperCase() as HttpMethod,
  }));
