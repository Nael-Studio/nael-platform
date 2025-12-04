import { getMetadata, setMetadata } from '../utils/metadata';
import type { RequestContext } from '../interfaces/http';

type RouteArgType = 'body' | 'param' | 'query' | 'headers' | 'request' | 'context' | 'custom';

export type RouteParamFactory<Data = unknown, Result = unknown> = (
  data: Data | undefined,
  context: RequestContext,
  designType?: unknown,
) => Result | Promise<Result>;

export interface RouteArgMetadata<Data = unknown> {
  index: number;
  type: RouteArgType;
  data?: Data;
  factory?: RouteParamFactory<Data>;
}

const ROUTE_ARGS_METADATA_KEY = Symbol.for('nl:http:route:args');

type Stage3ParameterContext = {
  kind: 'parameter';
  name: string | symbol;
  index: number;
  static: boolean;
  addInitializer(initializer: (this: unknown) => void): void;
};

const isStage3ParameterContext = (value: unknown): value is Stage3ParameterContext =>
  typeof value === 'object' && value !== null && (value as Stage3ParameterContext).kind === 'parameter';

const appendRouteArgMetadata = (
  target: object,
  propertyKey: string | symbol,
  metadata: RouteArgMetadata,
): void => {
  const existing = (getMetadata(ROUTE_ARGS_METADATA_KEY, target, propertyKey) as RouteArgMetadata[]) ?? [];
  const withoutIndex = existing.filter((entry) => entry.index !== metadata.index);
  setMetadata(ROUTE_ARGS_METADATA_KEY, [...withoutIndex, metadata], target, propertyKey);
};

const createParameterDecorator = (type: RouteArgType) =>
  (data?: string): ParameterDecorator =>
    ((targetOrValue: unknown, propertyKeyOrContext: unknown, parameterIndex?: number) => {
      if (isStage3ParameterContext(propertyKeyOrContext)) {
        const context = propertyKeyOrContext;
        context.addInitializer(function () {
          const prototype = context.static ? this : Object.getPrototypeOf(this);
          if (!prototype) {
            return;
          }

          appendRouteArgMetadata(prototype, context.name, {
            index: context.index,
            type,
            data,
          });
        });
        return;
      }

      appendRouteArgMetadata(targetOrValue as object, propertyKeyOrContext as string | symbol, {
        index: parameterIndex ?? 0,
        type,
        data,
      });
    }) as ParameterDecorator;

export const Body = (propertyPath?: string): ParameterDecorator =>
  createParameterDecorator('body')(propertyPath);

export const Param = (paramName?: string): ParameterDecorator =>
  createParameterDecorator('param')(paramName);

export const Query = (queryParam?: string): ParameterDecorator =>
  createParameterDecorator('query')(queryParam);

/**
 * Decorator to inject a header value. The header name is automatically converted to lowercase,
 * as HTTP headers are case-insensitive.
 */
export const Headers = (headerName?: string): ParameterDecorator =>
  createParameterDecorator('headers')(headerName?.toLowerCase());

export const Req = (): ParameterDecorator => createParameterDecorator('request')();

export const Context = (): ParameterDecorator => createParameterDecorator('context')();

export const getRouteArgsMetadata = (
  target: object,
  propertyKey: string | symbol,
): RouteArgMetadata[] =>
  ((getMetadata(ROUTE_ARGS_METADATA_KEY, target, propertyKey) as RouteArgMetadata[]) ?? []).slice().sort(
    (a, b) => a.index - b.index,
  );

export const createHttpParamDecorator = <Data = unknown, Result = unknown>(
  factory: RouteParamFactory<Data, Result>,
): ((data?: Data) => ParameterDecorator) =>
  (data?: Data) =>
    ((targetOrValue: unknown, propertyKeyOrContext: unknown, parameterIndex?: number) => {
      const metadata: RouteArgMetadata = {
        index: parameterIndex ?? 0,
        type: 'custom',
        data,
        factory: factory as RouteParamFactory,
      };

      if (isStage3ParameterContext(propertyKeyOrContext)) {
        const context = propertyKeyOrContext;
        context.addInitializer(function () {
          const prototype = context.static ? this : Object.getPrototypeOf(this);
          if (!prototype) {
            return;
          }
          appendRouteArgMetadata(prototype, context.name, {
            index: context.index,
            type: 'custom',
            data,
            factory: factory as RouteParamFactory,
          });
        });
        return;
      }

      appendRouteArgMetadata(targetOrValue as object, propertyKeyOrContext as string | symbol, metadata);
    }) as ParameterDecorator;
