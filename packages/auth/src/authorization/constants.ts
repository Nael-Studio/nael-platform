/**
 * Metadata key holding the ANY-of role requirement written by `@Roles(...)`.
 * The value is a `string[]`; an empty array means "no role constraint".
 */
export const ROLES_METADATA_KEY = Symbol.for('@nl-framework/auth/roles');

/**
 * Metadata key holding the ALL-of permission requirement written by
 * `@Permissions(...)`. The value is a `string[]`.
 */
export const PERMISSIONS_METADATA_KEY = Symbol.for('@nl-framework/auth/permissions');

/**
 * DI token for the normalized {@link NormalizedAuthorizationOptions}. Provided by
 * `BetterAuthModule.forRoot`/`forRootAsync`, or via `createAuthorizationProviders`.
 */
export const AUTHORIZATION_OPTIONS = Symbol.for('@nl-framework/auth/authorization-options');
