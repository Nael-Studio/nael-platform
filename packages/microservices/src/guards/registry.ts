import type { MicroserviceGuardToken } from './types';

/**
 * Global microservice guards, run before every handler's own guards. Mirrors
 * `registerHttpGuard` naming and the in-package exception-filter registry.
 */
let globalGuards: MicroserviceGuardToken[] = [];

export const registerMicroserviceGuard = (guard: MicroserviceGuardToken): void => {
  globalGuards.push(guard);
};

export const registerMicroserviceGuards = (...guards: MicroserviceGuardToken[]): void => {
  globalGuards.push(...guards);
};

export const listMicroserviceGuards = (): MicroserviceGuardToken[] => [...globalGuards];

export const clearMicroserviceGuards = (): void => {
  globalGuards = [];
};
