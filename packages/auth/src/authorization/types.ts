import type { BetterAuthSessionPayload } from '../types';

/**
 * The authenticated principal as attached by `AuthGuard`/`MultiTenantAuthGuard`.
 * Better Auth's `getSession` yields `{ session, user }`; both are surfaced to the
 * resolvers so callers can read roles from wherever their setup stores them.
 */
export type AuthorizationPrincipal = BetterAuthSessionPayload;

/**
 * Extracts the ANY-of roles a principal holds. Receives the Better Auth session
 * record, the user record, and — under multi-tenant auth — the active tenant id.
 */
export type RolesResolver = (
  session: unknown,
  user: unknown,
  tenantId?: string,
) => string[] | Promise<string[]>;

/**
 * Extracts the permissions a principal holds (checked with ALL-of semantics).
 */
export type PermissionsResolver = (
  session: unknown,
  user: unknown,
  tenantId?: string,
) => string[] | Promise<string[]>;

/**
 * Derives the active tenant id from a principal, passed through to the role and
 * permission resolvers so roles can be scoped per tenant.
 */
export type TenantResolver = (principal: AuthorizationPrincipal) => string | undefined;

/**
 * Minimal shape of a microservice execution context the guard reads from. Kept
 * structural so `@nl-framework/auth` need not depend on `@nl-framework/microservices`.
 */
export interface MicroservicePrincipalSource {
  getMetadata(): Record<string, string> | undefined;
  getPattern(): unknown;
}

/**
 * Resolves the principal for a message handler (there is no HTTP/GraphQL session
 * to read). Returns `null`/`undefined` when the message carries no principal.
 */
export type MicroservicePrincipalResolver = (
  context: MicroservicePrincipalSource,
) => AuthorizationPrincipal | null | undefined;

/**
 * User-facing authorization configuration, passed via
 * `BetterAuthModule.forRoot({ authorization: { ... } })`.
 */
export interface AuthorizationOptions {
  rolesResolver?: RolesResolver;
  permissionsResolver?: PermissionsResolver;
  tenantResolver?: TenantResolver;
  microservicePrincipalResolver?: MicroservicePrincipalResolver;
}

export interface NormalizedAuthorizationOptions {
  rolesResolver: RolesResolver;
  permissionsResolver: PermissionsResolver;
  tenantResolver: TenantResolver;
  microservicePrincipalResolver: MicroservicePrincipalResolver;
}
