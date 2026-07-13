import { SetMetadata, type CustomDecorator } from '@nl-framework/core';
import { PERMISSIONS_METADATA_KEY, ROLES_METADATA_KEY } from './constants';

/**
 * Requires the authenticated principal to hold **at least one** of the listed
 * roles (ANY-of). Applies at the class or method level; a method-level `@Roles`
 * *replaces* the controller-level one (there is no union — matching the guard
 * semantics users expect).
 *
 * ```ts
 * @Roles('admin', 'editor')
 * ```
 */
export const Roles = (...roles: string[]): CustomDecorator =>
  SetMetadata(ROLES_METADATA_KEY, roles);

/**
 * Requires the authenticated principal to hold **all** of the listed permissions
 * (ALL-of). Method-level replaces controller-level, like {@link Roles}.
 *
 * ```ts
 * @Permissions('billing:write')
 * ```
 */
export const Permissions = (...permissions: string[]): CustomDecorator =>
  SetMetadata(PERMISSIONS_METADATA_KEY, permissions);
