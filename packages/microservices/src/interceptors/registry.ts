import type { MicroserviceInterceptorToken } from './types';

/**
 * Global microservice interceptors, run outermost (before every handler's own
 * interceptors). Mirrors `registerHttpInterceptor` naming.
 */
let globalInterceptors: MicroserviceInterceptorToken[] = [];

export const registerMicroserviceInterceptor = (
  interceptor: MicroserviceInterceptorToken,
): void => {
  globalInterceptors.push(interceptor);
};

export const registerMicroserviceInterceptors = (
  ...interceptors: MicroserviceInterceptorToken[]
): void => {
  globalInterceptors.push(...interceptors);
};

export const listMicroserviceInterceptors = (): MicroserviceInterceptorToken[] => [
  ...globalInterceptors,
];

export const clearMicroserviceInterceptors = (): void => {
  globalInterceptors = [];
};
