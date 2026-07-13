import type { Provider } from '@nl-framework/core';
import { AUTHORIZATION_OPTIONS } from './constants';
import { RolesGuard } from './guard';
import { normalizeAuthorizationOptions } from './resolvers';
import type { AuthorizationOptions } from './types';

/**
 * Builds the DI providers needed for `RolesGuard`: the normalized authorization
 * options and the guard itself. `BetterAuthModule.forRoot` spreads these in
 * automatically; use this helper to wire RBAC into a module that does not import
 * `BetterAuthModule` (e.g. a standalone GraphQL gateway).
 *
 * ```ts
 * @Module({ providers: [...createAuthorizationProviders({ rolesResolver })] })
 * ```
 */
export const createAuthorizationProviders = (options: AuthorizationOptions = {}): Provider[] => [
  { provide: AUTHORIZATION_OPTIONS, useValue: normalizeAuthorizationOptions(options) },
  RolesGuard,
];
