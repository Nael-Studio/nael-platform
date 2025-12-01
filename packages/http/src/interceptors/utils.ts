import type { ClassType } from '@nl-framework/core';
import type {
  BaseInterceptor,
  BaseInterceptorFunction,
  BaseInterceptorToken,
} from './types';

const INTERCEPTOR_CLASS_MARKER = Symbol.for('nl:http:interceptors:class');
const INTERCEPTOR_FUNCTION_MARKER = Symbol.for('nl:http:interceptors:function');

type InterceptorConstructor = ClassType<BaseInterceptor> & {
  prototype: BaseInterceptor;
  [INTERCEPTOR_CLASS_MARKER]?: true;
};

type InterceptorCallable = BaseInterceptorFunction & {
  [INTERCEPTOR_FUNCTION_MARKER]?: true;
};

const defineMarker = <Marker extends symbol>(target: Function, marker: Marker): void => {
  if (Object.prototype.hasOwnProperty.call(target, marker)) {
    return;
  }

  Object.defineProperty(target, marker, {
    value: true,
    enumerable: false,
    configurable: false,
    writable: false,
  });
};

const hasInterceptPrototype = (token: unknown): token is InterceptorConstructor =>
  typeof token === 'function' &&
  typeof (token as { prototype?: { intercept?: unknown } }).prototype?.intercept === 'function';

export const markInterceptorToken = <C = unknown>(token: BaseInterceptorToken<C>): void => {
  if (hasInterceptPrototype(token)) {
    defineMarker(token, INTERCEPTOR_CLASS_MARKER);
    return;
  }

  if (typeof token === 'function') {
    defineMarker(token, INTERCEPTOR_FUNCTION_MARKER);
  }
};

const hasClassMarker = (token: unknown): token is InterceptorConstructor =>
  typeof token === 'function' && Boolean((token as InterceptorConstructor)[INTERCEPTOR_CLASS_MARKER]);

const hasFunctionMarker = (token: unknown): token is InterceptorCallable =>
  typeof token === 'function' && Boolean((token as InterceptorCallable)[INTERCEPTOR_FUNCTION_MARKER]);

export const isInterceptorClassToken = <C = unknown>(
  token: BaseInterceptorToken<C>,
): token is ClassType<BaseInterceptor<C>> => {
  if (hasClassMarker(token)) {
    return true;
  }

  if (hasFunctionMarker(token)) {
    return false;
  }

  return hasInterceptPrototype(token);
};

export const isInterceptorFunctionToken = <C = unknown>(
  token: BaseInterceptorToken<C>,
): token is BaseInterceptorFunction<C> => {
  if (hasFunctionMarker(token)) {
    return true;
  }

  if (hasClassMarker(token)) {
    return false;
  }

  return typeof token === 'function' && !hasInterceptPrototype(token);
};
