import type { Token } from '@nl-framework/core';
import type { Logger } from '@nl-framework/logger';
import type { HttpMethod, RequestContext } from './interfaces/http';
import type { GuardToken } from './guards/types';
import { markGuardToken } from './guards/utils';

const GLOBAL_REGISTRARS_KEY = Symbol.for('nl:http:route-registrars');
const GLOBAL_GUARDS_KEY = Symbol.for('nl:http:guards');

interface GlobalRegistrars {
  [GLOBAL_REGISTRARS_KEY]?: HttpRouteRegistrar[];
  [GLOBAL_GUARDS_KEY]?: GuardToken[];
}

const getGlobalRegistrars = (): GlobalRegistrars => globalThis as GlobalRegistrars;

export interface HttpRouteRegistrationApi {
  readonly logger: Logger;
  registerRoute(
    method: HttpMethod,
    path: string,
    handler: (context: RequestContext) => unknown | Promise<unknown>,
  ): void;
  resolve<T>(token: Token<T>): Promise<T>;
}

export type HttpRouteRegistrar = (api: HttpRouteRegistrationApi) => void | Promise<void>;

export const registerHttpRouteRegistrar = (registrar: HttpRouteRegistrar): void => {
  const registry = getGlobalRegistrars();
  const existing = registry[GLOBAL_REGISTRARS_KEY];

  if (existing) {
    existing.push(registrar);
    return;
  }

  registry[GLOBAL_REGISTRARS_KEY] = [registrar];
};

export const listHttpRouteRegistrars = (): HttpRouteRegistrar[] => {
  const registry = getGlobalRegistrars();
  return [...(registry[GLOBAL_REGISTRARS_KEY] ?? [])];
};

export const clearHttpRouteRegistrars = (): void => {
  const registry = getGlobalRegistrars();
  if (registry[GLOBAL_REGISTRARS_KEY]) {
    delete registry[GLOBAL_REGISTRARS_KEY];
  }
};

export const registerHttpGuard = (guard: GuardToken): void => {
  markGuardToken(guard);
  const registry = getGlobalRegistrars();
  const existing = registry[GLOBAL_GUARDS_KEY];

  if (existing) {
    existing.push(guard);
    return;
  }

  registry[GLOBAL_GUARDS_KEY] = [guard];
};

export const registerHttpGuards = (...guards: GuardToken[]): void => {
  for (const guard of guards) {
    registerHttpGuard(guard);
  }
};

export const listHttpGuards = (): GuardToken[] => {
  const registry = getGlobalRegistrars();
  return [...(registry[GLOBAL_GUARDS_KEY] ?? [])];
};

export const clearHttpGuards = (): void => {
  const registry = getGlobalRegistrars();
  if (registry[GLOBAL_GUARDS_KEY]) {
    delete registry[GLOBAL_GUARDS_KEY];
  }
};
