import 'reflect-metadata';
import { isStage3ClassContext, isStage3MethodContext } from './metadata-helpers';

export type FilterToken = unknown;

const FILTERS_METADATA_KEY = Symbol.for('nl:filters:metadata');

const defineFilterMetadata = (
  target: object,
  value: FilterToken[],
  propertyKey?: string | symbol,
): void => {
  if (propertyKey !== undefined) {
    Reflect.defineMetadata(FILTERS_METADATA_KEY, value, target, propertyKey);
    return;
  }
  Reflect.defineMetadata(FILTERS_METADATA_KEY, value, target);
};

const readFilterMetadata = (target: object, propertyKey?: string | symbol): FilterToken[] => {
  const existing =
    (propertyKey !== undefined
      ? (Reflect.getMetadata(FILTERS_METADATA_KEY, target, propertyKey) as FilterToken[] | undefined)
      : (Reflect.getMetadata(FILTERS_METADATA_KEY, target) as FilterToken[] | undefined)) ?? [];
  return existing.length ? [...existing] : [];
};

const appendFilterMetadata = (
  target: object,
  filters: FilterToken[],
  propertyKey?: string | symbol,
): void => {
  if (!filters.length) {
    return;
  }
  const existing = readFilterMetadata(target, propertyKey);
  const next = existing.length ? [...existing, ...filters] : [...filters];
  defineFilterMetadata(target, next, propertyKey);
};

export const UseFilters = (...filters: FilterToken[]): ClassDecorator & MethodDecorator =>
  ((targetOrValue: unknown, context?: unknown) => {
    if (isStage3MethodContext(context)) {
      context.addInitializer(function () {
        const container = context.static ? this : Object.getPrototypeOf(this);
        if (!container) {
          return;
        }
        appendFilterMetadata(container as object, filters, context.name);
      });
      return targetOrValue as PropertyDescriptor['value'];
    }

    if (isStage3ClassContext(context)) {
      context.addInitializer(function () {
        appendFilterMetadata(this as object, filters);
      });
      return targetOrValue as new (...args: unknown[]) => unknown;
    }

    if (typeof context === 'undefined') {
      appendFilterMetadata(targetOrValue as object, filters);
      return targetOrValue as ClassDecorator;
    }

    appendFilterMetadata(targetOrValue as object, filters, context as string | symbol);
    return targetOrValue as PropertyDescriptor['value'];
  }) as ClassDecorator & MethodDecorator;

export const getFilterMetadata = (target: object, propertyKey?: string | symbol): FilterToken[] =>
  readFilterMetadata(target, propertyKey);

export const listAppliedFilters = <T = FilterToken>(
  controller: object,
  handlerName?: string | symbol,
): T[] => {
  const filters: FilterToken[] = [];
  const dedupe = <K>(items: K[]): K[] => {
    const result: K[] = [];
    const seen = new Set<K>();
    for (const item of items) {
      if (!seen.has(item)) {
        seen.add(item);
        result.push(item);
      }
    }
    return result;
  };

  const appendFromTarget = (target: object | null | undefined, propertyKey?: string | symbol): void => {
    if (!target) {
      return;
    }
    const visited = new Set<object>();
    let current: object | null = target;
    while (current && !visited.has(current)) {
      visited.add(current);
      const metadata = readFilterMetadata(current, propertyKey);
      if (metadata.length) {
        filters.push(...metadata);
      }
      current = Object.getPrototypeOf(current);
    }
  };

  if (typeof controller === 'function') {
    if (handlerName !== undefined) {
      appendFromTarget(controller, handlerName);
      if ('prototype' in controller) {
        appendFromTarget(controller.prototype, handlerName);
      }
    }
    appendFromTarget(controller);
    if ('prototype' in controller) {
      appendFromTarget(controller.prototype);
    }
  } else if (controller && typeof controller === 'object') {
    if (handlerName !== undefined) {
      appendFromTarget(controller, handlerName);
    }
    appendFromTarget(controller);
  }

  return dedupe(filters) as T[];
};

export { FILTERS_METADATA_KEY };
