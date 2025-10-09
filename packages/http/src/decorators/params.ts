import { getMetadata, setMetadata } from '../utils/metadata';

type RouteArgType = 'body' | 'param' | 'query' | 'headers' | 'request' | 'context';

export interface RouteArgMetadata {
  index: number;
  type: RouteArgType;
  data?: string;
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
