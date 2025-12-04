import type { ExceptionFilter } from './exception-filter.interface';

const GLOBAL_EXCEPTION_FILTERS_KEY = Symbol.for('nl:http:exception-filters');

type GlobalRegistry = typeof globalThis & {
  [GLOBAL_EXCEPTION_FILTERS_KEY]?: ExceptionFilter[];
};

const getRegistry = (): GlobalRegistry => globalThis as GlobalRegistry;

export const registerExceptionFilter = (filter: ExceptionFilter): void => {
  const registry = getRegistry();
  const existing = registry[GLOBAL_EXCEPTION_FILTERS_KEY];

  if (existing) {
    existing.push(filter);
    return;
  }

  registry[GLOBAL_EXCEPTION_FILTERS_KEY] = [filter];
};

export const registerExceptionFilters = (...filters: ExceptionFilter[]): void => {
  for (const filter of filters) {
    registerExceptionFilter(filter);
  }
};

export const listExceptionFilters = (): ExceptionFilter[] => {
  const registry = getRegistry();
  return [...(registry[GLOBAL_EXCEPTION_FILTERS_KEY] ?? [])];
};

export const clearExceptionFilters = (): void => {
  const registry = getRegistry();
  if (registry[GLOBAL_EXCEPTION_FILTERS_KEY]) {
    delete registry[GLOBAL_EXCEPTION_FILTERS_KEY];
  }
};
