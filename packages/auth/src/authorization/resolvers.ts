import type {
  AuthorizationOptions,
  AuthorizationPrincipal,
  MicroservicePrincipalResolver,
  NormalizedAuthorizationOptions,
  PermissionsResolver,
  RolesResolver,
  TenantResolver,
} from './types';

/**
 * Normalizes a role/permission field into a flat `string[]`. Accepts a single
 * string, a comma-separated string (Better Auth's `admin` plugin stores roles as
 * `"admin,editor"`), a string array, or `undefined`.
 */
const collectValues = (value: unknown): string[] => {
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
  }
  if (Array.isArray(value)) {
    return value.flatMap((entry) => collectValues(entry));
  }
  return [];
};

const asRecord = (value: unknown): Record<string, unknown> | undefined =>
  typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : undefined;

/**
 * Default role extraction: Better Auth `user.role` (string or string[]) plus, when
 * the organization plugin is active, the active-org member role. Also reads
 * `user.roles` and a `member.role` for common plugin layouts.
 */
export const defaultRolesResolver: RolesResolver = (session, user) => {
  const roles = new Set<string>();
  const userRecord = asRecord(user);
  const sessionRecord = asRecord(session);

  if (userRecord) {
    for (const value of collectValues(userRecord.role)) roles.add(value);
    for (const value of collectValues(userRecord.roles)) roles.add(value);
    for (const value of collectValues(asRecord(userRecord.member)?.role)) roles.add(value);
  }

  if (sessionRecord) {
    for (const value of collectValues(sessionRecord.activeOrganizationRole)) roles.add(value);
    for (const value of collectValues(asRecord(sessionRecord.member)?.role)) roles.add(value);
  }

  return [...roles];
};

/**
 * Default permission extraction: `user.permissions` (string or string[]).
 */
export const defaultPermissionsResolver: PermissionsResolver = (_session, user) => {
  const userRecord = asRecord(user);
  return userRecord ? collectValues(userRecord.permissions) : [];
};

/**
 * Default tenant extraction: the Better Auth organization plugin records the
 * active organization on the session (`session.activeOrganizationId`).
 */
export const defaultTenantResolver: TenantResolver = (principal) => {
  const session = asRecord(principal.session) ?? asRecord(principal);
  const value = session?.activeOrganizationId;
  return typeof value === 'string' ? value : undefined;
};

/**
 * Default microservice principal extraction: reads a JSON principal from the
 * `x-principal` metadata entry when present. Off-message principals are opt-in —
 * override this resolver to read from wherever the transport places identity.
 */
export const defaultMicroservicePrincipalResolver: MicroservicePrincipalResolver = (context) => {
  const metadata = context.getMetadata();
  const raw = metadata?.['x-principal'];
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as AuthorizationPrincipal;
  } catch {
    return null;
  }
};

export const normalizeAuthorizationOptions = (
  options: AuthorizationOptions = {},
): NormalizedAuthorizationOptions => ({
  rolesResolver: options.rolesResolver ?? defaultRolesResolver,
  permissionsResolver: options.permissionsResolver ?? defaultPermissionsResolver,
  tenantResolver: options.tenantResolver ?? defaultTenantResolver,
  microservicePrincipalResolver:
    options.microservicePrincipalResolver ?? defaultMicroservicePrincipalResolver,
});
