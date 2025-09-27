import type { HttpMethod, RouteDefinition } from '../interfaces/http';
import { getMetadata, setMetadata } from '../utils/metadata';

const ROUTE_METADATA_KEY = Symbol.for('nl:http:routes');

type Stage3MethodContext = {
  kind: 'method';
  name: string | symbol;
  static: boolean;
  addInitializer(initializer: (this: unknown) => void): void;
};

const appendRouteDefinition = (target: object, definition: RouteDefinition): void => {
  const existing: RouteDefinition[] =
    (getMetadata(ROUTE_METADATA_KEY, target.constructor) as RouteDefinition[]) ?? [];
  setMetadata(ROUTE_METADATA_KEY, [...existing, definition], target.constructor);
};

const isStage3Context = (value: unknown): value is Stage3MethodContext =>
  typeof value === 'object' && value !== null && 'kind' in value && (value as Stage3MethodContext).kind === 'method';

const createRouteDecorator = (method: HttpMethod) =>
  (path = ''): MethodDecorator =>
    ((targetOrValue: unknown, maybeContext?: unknown, descriptor?: PropertyDescriptor) => {
      if (isStage3Context(maybeContext)) {
        const context = maybeContext;
        if (context.kind !== 'method') {
          return targetOrValue;
        }

        context.addInitializer(function () {
          const prototype = context.static ? this : Object.getPrototypeOf(this);
          if (!prototype) {
            return;
          }

          appendRouteDefinition(prototype as object, {
            method,
            path,
            handlerName: String(context.name),
          });
        });

        return targetOrValue as PropertyDescriptor['value'];
      }

      const target = targetOrValue as object;
      const propertyKey = maybeContext as string | symbol;
      appendRouteDefinition(target, {
        method,
        path,
        handlerName: String(propertyKey),
      });
      return descriptor;
    }) as MethodDecorator;

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
