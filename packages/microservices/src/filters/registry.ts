import type { MicroserviceExceptionFilterToken } from './types';

let globalFilters: MicroserviceExceptionFilterToken[] = [];

export const registerMicroserviceExceptionFilter = (
  filter: MicroserviceExceptionFilterToken,
): void => {
  globalFilters.push(filter);
};

export const registerMicroserviceExceptionFilters = (
  ...filters: MicroserviceExceptionFilterToken[]
): void => {
  globalFilters.push(...filters);
};

export const listMicroserviceExceptionFilters = (): MicroserviceExceptionFilterToken[] =>
  [...globalFilters];

export const clearMicroserviceExceptionFilters = (): void => {
  globalFilters = [];
};
