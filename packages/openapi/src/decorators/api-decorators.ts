import 'reflect-metadata';
import type { ClassType } from '@nl-framework/core';
import {
  API_TAGS_METADATA_KEY,
  API_OPERATION_METADATA_KEY,
  API_RESPONSE_METADATA_KEY,
  API_SECURITY_METADATA_KEY,
  API_EXCLUDE_METADATA_KEY,
} from '../constants';

export interface ApiOperationOptions {
  summary?: string;
  description?: string;
  deprecated?: boolean;
}

export interface ApiResponseOptions {
  type?: ClassType;
  description?: string;
}

export interface ApiResponseMetadata {
  status: number | string;
  type?: ClassType;
  description?: string;
}

export interface ApiSecurityMetadata {
  name: string;
  scopes: string[];
}

type Stage3Context = {
  kind: string;
  name?: string | symbol;
  static?: boolean;
  addInitializer(initializer: (this: unknown) => void): void;
};

const isStage3Context = (value: unknown): value is Stage3Context =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as Stage3Context).addInitializer === 'function' &&
  typeof (value as Stage3Context).kind === 'string';

const write = (
  key: unknown,
  compute: (existing: unknown) => unknown,
  target: object,
  propertyKey?: string | symbol,
): void => {
  const existing = Reflect.getMetadata(key, target, propertyKey as string | symbol);
  Reflect.defineMetadata(key, compute(existing), target, propertyKey as string | symbol);
};

/**
 * Build a class/method decorator that folds a value into metadata under `key`.
 * Works in both the legacy (`experimentalDecorators`) and stage-3 native
 * decorator worlds, matching the framework's other decorators.
 */
const createApiDecorator = (key: unknown, compute: (existing: unknown) => unknown) =>
  ((targetOrValue: unknown, context?: unknown) => {
    if (isStage3Context(context)) {
      const ctx = context;
      ctx.addInitializer(function () {
        if (ctx.kind === 'class') {
          write(key, compute, this as object);
          return;
        }
        const container = ctx.static ? this : Object.getPrototypeOf(this);
        if (container && ctx.name !== undefined) {
          write(key, compute, container as object, ctx.name);
        }
      });
      return targetOrValue as never;
    }

    if (typeof context === 'undefined') {
      // Legacy class decorator — target is the constructor.
      write(key, compute, targetOrValue as object);
      return targetOrValue as never;
    }

    // Legacy method/property decorator — target is the prototype.
    write(key, compute, targetOrValue as object, context as string | symbol);
    return undefined as never;
  }) as ClassDecorator & MethodDecorator;

/** Attach one or more OpenAPI tags to a controller or a single operation. */
export const ApiTags = (...tags: string[]): ClassDecorator & MethodDecorator =>
  createApiDecorator(API_TAGS_METADATA_KEY, (existing) => {
    const current = Array.isArray(existing) ? (existing as string[]) : [];
    return Array.from(new Set([...current, ...tags]));
  });

/** Override the derived summary/description/deprecated flag of an operation. */
export const ApiOperation = (options: ApiOperationOptions): MethodDecorator =>
  createApiDecorator(API_OPERATION_METADATA_KEY, () => options) as MethodDecorator;

/** Document an additional response for an operation (accumulates). */
export const ApiResponse = (
  status: number | string,
  options: ApiResponseOptions = {},
): MethodDecorator =>
  createApiDecorator(API_RESPONSE_METADATA_KEY, (existing) => {
    const current = Array.isArray(existing) ? (existing as ApiResponseMetadata[]) : [];
    return [...current, { status, type: options.type, description: options.description }];
  }) as MethodDecorator;

/** Require a named security scheme for a controller or operation (accumulates). */
export const ApiSecurity = (
  name: string,
  scopes: string[] = [],
): ClassDecorator & MethodDecorator =>
  createApiDecorator(API_SECURITY_METADATA_KEY, (existing) => {
    const current = Array.isArray(existing) ? (existing as ApiSecurityMetadata[]) : [];
    return [...current, { name, scopes }];
  });

/** Hide an operation from the generated document. */
export const ApiExcludeEndpoint = (): MethodDecorator =>
  createApiDecorator(API_EXCLUDE_METADATA_KEY, () => true) as MethodDecorator;

export const getApiTags = (target: object, propertyKey?: string | symbol): string[] =>
  (Reflect.getMetadata(API_TAGS_METADATA_KEY, target, propertyKey as string | symbol) as
    | string[]
    | undefined) ?? [];

export const getApiOperation = (
  target: object,
  propertyKey: string | symbol,
): ApiOperationOptions | undefined =>
  Reflect.getMetadata(API_OPERATION_METADATA_KEY, target, propertyKey) as
    | ApiOperationOptions
    | undefined;

export const getApiResponses = (
  target: object,
  propertyKey: string | symbol,
): ApiResponseMetadata[] =>
  (Reflect.getMetadata(API_RESPONSE_METADATA_KEY, target, propertyKey) as
    | ApiResponseMetadata[]
    | undefined) ?? [];

export const getApiSecurity = (
  target: object,
  propertyKey?: string | symbol,
): ApiSecurityMetadata[] =>
  (Reflect.getMetadata(API_SECURITY_METADATA_KEY, target, propertyKey as string | symbol) as
    | ApiSecurityMetadata[]
    | undefined) ?? [];

export const isApiExcluded = (target: object, propertyKey: string | symbol): boolean =>
  Reflect.getMetadata(API_EXCLUDE_METADATA_KEY, target, propertyKey) === true;
