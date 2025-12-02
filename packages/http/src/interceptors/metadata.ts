import 'reflect-metadata';
import type { BaseInterceptorToken } from './types';
import { getInterceptors as getCoreInterceptors } from '@nl-framework/core';
import { markInterceptorToken } from './utils';

const INTERCEPTORS_METADATA_KEY = Symbol.for('nl:http:interceptors:metadata');

type Stage3MethodContext = {
  kind: 'method';
  name: string | symbol;
  static: boolean;
  addInitializer(initializer: (this: unknown) => void): void;
};

type Stage3ClassContext = {
  kind: 'class';
  addInitializer(initializer: (this: unknown) => void): void;
};

const isStage3MethodContext = (value: unknown): value is Stage3MethodContext =>
  typeof value === 'object' && value !== null && (value as Stage3MethodContext).kind === 'method';

const isStage3ClassContext = (value: unknown): value is Stage3ClassContext =>
  typeof value === 'object' && value !== null && (value as Stage3ClassContext).kind === 'class';

type AnyInterceptorToken = BaseInterceptorToken<any>;

const defineInterceptorMetadata = (
  target: object,
  value: AnyInterceptorToken[],
  propertyKey?: string | symbol,
): void => {
  if (propertyKey !== undefined) {
    Reflect.defineMetadata(INTERCEPTORS_METADATA_KEY, value, target, propertyKey);
    return;
  }
  Reflect.defineMetadata(INTERCEPTORS_METADATA_KEY, value, target);
};

const readInterceptorMetadata = (target: object, propertyKey?: string | symbol): AnyInterceptorToken[] => {
  const local =
    (propertyKey !== undefined
      ? (Reflect.getMetadata(INTERCEPTORS_METADATA_KEY, target, propertyKey) as BaseInterceptorToken[] | undefined)
      : (Reflect.getMetadata(INTERCEPTORS_METADATA_KEY, target) as BaseInterceptorToken[] | undefined)) ?? [];
  const core =
    (propertyKey !== undefined
      ? getCoreInterceptors(target, propertyKey)
      : getCoreInterceptors(target)) ?? [];
  const merged = [...local, ...core];
  return merged.length ? merged : [];
};

const appendInterceptorMetadata = (
  target: object,
  interceptors: AnyInterceptorToken[],
  propertyKey?: string | symbol,
): void => {
  if (!interceptors.length) {
    return;
  }
  const existing = readInterceptorMetadata(target, propertyKey);
  const next = existing.length ? [...existing, ...interceptors] : [...interceptors];
  defineInterceptorMetadata(target, next, propertyKey);
};

export const UseInterceptors = (
  ...interceptors: AnyInterceptorToken[]
): ClassDecorator & MethodDecorator =>
  ((targetOrValue: unknown, context?: unknown) => {
    for (const interceptor of interceptors) {
      markInterceptorToken(interceptor);
    }

    if (isStage3MethodContext(context)) {
      context.addInitializer(function () {
        const container = context.static ? this : Object.getPrototypeOf(this);
        if (!container) {
          return;
        }
        appendInterceptorMetadata(container as object, interceptors, context.name);
      });
      return targetOrValue as PropertyDescriptor['value'];
    }

    if (isStage3ClassContext(context)) {
      context.addInitializer(function () {
        appendInterceptorMetadata(this as object, interceptors);
      });
      return targetOrValue as new (...args: unknown[]) => unknown;
    }

    if (typeof context === 'undefined') {
      appendInterceptorMetadata(targetOrValue as object, interceptors);
      return targetOrValue as ClassDecorator;
    }

    appendInterceptorMetadata(targetOrValue as object, interceptors, context as string | symbol);
    return targetOrValue as PropertyDescriptor['value'];
  }) as ClassDecorator & MethodDecorator;

export const getInterceptorMetadata = (
  target: object,
  propertyKey?: string | symbol,
): AnyInterceptorToken[] => readInterceptorMetadata(target, propertyKey);

export const listAppliedInterceptors = <C = unknown>(
  controller: object,
  handlerName?: string | symbol,
): BaseInterceptorToken<C>[] => {
  const interceptors: AnyInterceptorToken[] = [];

  const appendFromTarget = (target: object | null | undefined, propertyKey?: string | symbol): void => {
    if (!target) {
      return;
    }
    const visited = new Set<object>();
    let current: object | null = target;
    while (current && !visited.has(current)) {
      visited.add(current);
      const metadata = readInterceptorMetadata(current, propertyKey);
      if (metadata.length) {
        interceptors.push(...metadata);
      }
      current = Object.getPrototypeOf(current);
    }
  };

  if (typeof controller === 'function') {
    appendFromTarget(controller);
    if ('prototype' in controller) {
      appendFromTarget(controller.prototype);
    }
    if (handlerName !== undefined) {
      appendFromTarget(controller, handlerName);
      if ('prototype' in controller) {
        appendFromTarget(controller.prototype, handlerName);
      }
    }
  } else if (controller && typeof controller === 'object') {
    appendFromTarget(controller);
    if (handlerName !== undefined) {
      appendFromTarget(controller, handlerName);
    }
  }

  return interceptors as BaseInterceptorToken<C>[];
};

export const HTTP_INTERCEPTORS_METADATA_KEY = INTERCEPTORS_METADATA_KEY;
