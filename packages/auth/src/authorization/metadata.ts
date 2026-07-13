import 'reflect-metadata';
import { PERMISSIONS_METADATA_KEY, ROLES_METADATA_KEY } from './constants';

/**
 * Resolves the effective metadata array for `key` given a controller/resolver
 * class (or instance) and an optional handler name, applying **method-replaces-
 * controller** semantics: if the handler carries the metadata it wins outright;
 * otherwise the class-level value is used. Returns `undefined` when neither
 * target declares it (route unconstrained).
 *
 * Mirrors `isPublicRoute`'s target-walking so both the class (constructor) and
 * its prototype are inspected — SetMetadata stores method metadata on the
 * prototype and class metadata on the constructor.
 */
const readMetadata = (
  key: symbol,
  controller: object,
  handlerName?: string | symbol,
): string[] | undefined => {
  const targets: Array<object | undefined> = [controller];
  if (typeof controller === 'function' && 'prototype' in controller) {
    targets.push((controller as { prototype?: object }).prototype);
  }

  if (handlerName !== undefined) {
    for (const target of targets) {
      if (!target) {
        continue;
      }
      const method = Reflect.getMetadata(key, target, handlerName) as string[] | undefined;
      if (method !== undefined) {
        return method;
      }
    }
  }

  for (const target of targets) {
    if (!target) {
      continue;
    }
    const klass = Reflect.getMetadata(key, target) as string[] | undefined;
    if (klass !== undefined) {
      return klass;
    }
  }

  return undefined;
};

export interface AccessRequirement {
  /** ANY-of roles; empty when no `@Roles` applies. */
  roles: string[];
  /** ALL-of permissions; empty when no `@Permissions` applies. */
  permissions: string[];
  /** True when neither `@Roles` nor `@Permissions` constrains the handler. */
  isEmpty: boolean;
}

/**
 * Reads the combined role + permission requirement for a handler.
 */
export const readAccessRequirement = (
  controller: object,
  handlerName?: string | symbol,
): AccessRequirement => {
  const roles = readMetadata(ROLES_METADATA_KEY, controller, handlerName) ?? [];
  const permissions = readMetadata(PERMISSIONS_METADATA_KEY, controller, handlerName) ?? [];
  return { roles, permissions, isEmpty: roles.length === 0 && permissions.length === 0 };
};
