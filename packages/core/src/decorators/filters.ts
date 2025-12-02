import 'reflect-metadata';
import type { ClassType } from '../interfaces/provider';

const CATCH_TYPES_METADATA = Symbol.for('nl:filters:catch-types');
const USE_FILTERS_METADATA = Symbol.for('nl:filters:use-filters');

export interface ExceptionFilter<TError = unknown> {
  catch(exception: TError, host?: unknown): unknown | Promise<unknown>;
}

export function Catch(...types: ClassType<unknown>[]): ClassDecorator {
  return (target) => {
    Reflect.defineMetadata(CATCH_TYPES_METADATA, types, target);
  };
}

export function getCatchTypes(target: object): ClassType<unknown>[] | undefined {
  return Reflect.getMetadata(CATCH_TYPES_METADATA, target) as ClassType<unknown>[] | undefined;
}

export type FilterInstanceOrClass =
  | ExceptionFilter
  | ClassType<ExceptionFilter>;

export function UseFilters(...filters: FilterInstanceOrClass[]): MethodDecorator & ClassDecorator {
  return (target: object, propertyKey?: string | symbol) => {
    if (propertyKey) {
      Reflect.defineMetadata(USE_FILTERS_METADATA, filters, target, propertyKey);
    } else {
      Reflect.defineMetadata(USE_FILTERS_METADATA, filters, target);
    }
  };
}

export function getUseFilters(
  target: object,
  propertyKey?: string | symbol,
): FilterInstanceOrClass[] | undefined {
  if (propertyKey) {
    return Reflect.getMetadata(USE_FILTERS_METADATA, target, propertyKey) as
      | FilterInstanceOrClass[]
      | undefined;
  }
  return Reflect.getMetadata(USE_FILTERS_METADATA, target) as FilterInstanceOrClass[] | undefined;
}
