import 'reflect-metadata';
import { PUBLIC_ROUTE_METADATA_KEY } from '@nl-framework/http';

const PUBLIC_METADATA_KEY = PUBLIC_ROUTE_METADATA_KEY;

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

const markPublic = (target: object, propertyKey?: string | symbol): void => {
  if (propertyKey !== undefined) {
    Reflect.defineMetadata(PUBLIC_METADATA_KEY, true, target, propertyKey);
  } else {
    Reflect.defineMetadata(PUBLIC_METADATA_KEY, true, target);
  }
};

export const isPublicRoute = (controller: object, handlerName?: string | symbol): boolean => {
  const targets: Array<object | undefined> = [controller];

  if (typeof controller === 'function' && 'prototype' in controller) {
    targets.push((controller as { prototype?: object }).prototype);
  }

  for (const target of targets) {
    if (!target) {
      continue;
    }
    if (handlerName && Reflect.getMetadata(PUBLIC_METADATA_KEY, target, handlerName)) {
      return true;
    }
    if (Reflect.getMetadata(PUBLIC_METADATA_KEY, target)) {
      return true;
    }
  }

  return false;
};

export const Public = (): ClassDecorator & MethodDecorator =>
  ((targetOrValue: unknown, context?: unknown) => {
    if (isStage3MethodContext(context)) {
      context.addInitializer(function () {
        const prototype = context.static ? this : Object.getPrototypeOf(this);
        if (!prototype) {
          return;
        }
        markPublic(prototype, context.name);
      });
      return targetOrValue as PropertyDescriptor['value'];
    }

    if (isStage3ClassContext(context)) {
      context.addInitializer(function () {
        markPublic(this as object);
      });
      return targetOrValue as (new (...args: unknown[]) => unknown);
    }

    if (typeof context === 'undefined') {
      markPublic(targetOrValue as object);
      return targetOrValue as ClassDecorator;
    }

    markPublic(targetOrValue as object, context as string | symbol);
    return targetOrValue as PropertyDescriptor['value'];
  }) as ClassDecorator & MethodDecorator;

export const PUBLIC_METADATA_TOKEN = PUBLIC_METADATA_KEY;