import { Inject, Injectable } from '@nl-framework/core';
import {
  registerHttpGuard,
  type CanActivate,
  type GuardDecision,
  type HttpExecutionContext,
} from '@nl-framework/http';
import { registerGraphqlGuard, type GraphqlExecutionContext } from '@nl-framework/graphql';
import { getRequestAuth } from '../http/middleware';
import { isPublicRoute } from '../http/public.decorator';
import { AUTHORIZATION_OPTIONS } from './constants';
import { readAccessRequirement, type AccessRequirement } from './metadata';
import { normalizeAuthorizationOptions } from './resolvers';
import type {
  AuthorizationPrincipal,
  MicroservicePrincipalSource,
  NormalizedAuthorizationOptions,
} from './types';

const GRAPHQL_AUTH_STATE = Symbol.for('@nl-framework/auth/request-state');

let rolesGuardRegistered = false;

const isHttpContext = (context: unknown): context is HttpExecutionContext =>
  Boolean(context) && typeof (context as HttpExecutionContext).getRequest === 'function';

const isGraphqlContext = (context: unknown): context is GraphqlExecutionContext =>
  Boolean(context) && typeof (context as GraphqlExecutionContext).getContext === 'function';

const isMicroserviceContext = (
  context: unknown,
): context is MicroservicePrincipalSource & {
  getClass?: () => (new (...args: unknown[]) => unknown) | undefined;
  getHandlerName?: () => string | undefined;
} => Boolean(context) && typeof (context as MicroservicePrincipalSource).getPattern === 'function';

const getGraphqlPrincipal = (context: unknown): AuthorizationPrincipal | null => {
  const record = context as {
    [GRAPHQL_AUTH_STATE]?: AuthorizationPrincipal | null;
    auth?: AuthorizationPrincipal | null;
  };
  return record[GRAPHQL_AUTH_STATE] ?? record.auth ?? null;
};

/**
 * First-party RBAC guard. Reads the `@Roles` (ANY-of) / `@Permissions` (ALL-of)
 * metadata for the handler, then checks it against the authenticated principal
 * that `AuthGuard`/`MultiTenantAuthGuard` placed on the context.
 *
 * **Ordering is a hard requirement:** `RolesGuard` must run *after* the auth
 * guard (global guards execute in registration order). When a constrained
 * handler is reached with no principal, that indicates the auth guard did not
 * run first — the guard throws a configuration-hinting error rather than silently
 * allowing or denying.
 *
 * The same instance serves HTTP, GraphQL, and microservice message handlers by
 * branching on the execution context shape (like `AuthGuard`).
 */
@Injectable()
export class RolesGuard implements CanActivate {
  private readonly options: NormalizedAuthorizationOptions;

  constructor(@Inject(AUTHORIZATION_OPTIONS) options: NormalizedAuthorizationOptions) {
    this.options = normalizeAuthorizationOptions(options);
  }

  async canActivate(
    context: HttpExecutionContext | GraphqlExecutionContext | MicroservicePrincipalSource,
  ): Promise<GuardDecision> {
    if (isHttpContext(context)) {
      return this.handleHttp(context);
    }
    if (isGraphqlContext(context)) {
      return this.handleGraphql(context);
    }
    if (isMicroserviceContext(context)) {
      return this.handleMicroservice(context);
    }
    throw new Error('RolesGuard received an unsupported execution context.');
  }

  private forbiddenResponse(): Response {
    return new Response(JSON.stringify({ message: 'Forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private missingPrincipalError(transport: string): Error {
    return new Error(
      `RolesGuard ran on a ${transport} request that requires roles/permissions but no ` +
        'authenticated principal was found on the context. RolesGuard must run *after* ' +
        'AuthGuard/MultiTenantAuthGuard — register the auth guard first (global guards run in ' +
        'registration order) or list it first in @UseGuards(AuthGuard, RolesGuard).',
    );
  }

  /** Evaluates ANY-of roles then ALL-of permissions against the principal. */
  private async evaluate(
    requirement: AccessRequirement,
    principal: AuthorizationPrincipal,
    tenantId: string | undefined,
  ): Promise<boolean> {
    const session = (principal as { session?: unknown }).session ?? principal;
    const user = (principal as { user?: unknown }).user ?? principal;

    if (requirement.roles.length > 0) {
      const held = new Set(await this.options.rolesResolver(session, user, tenantId));
      if (!requirement.roles.some((role) => held.has(role))) {
        return false;
      }
    }

    if (requirement.permissions.length > 0) {
      const held = new Set(await this.options.permissionsResolver(session, user, tenantId));
      if (!requirement.permissions.every((permission) => held.has(permission))) {
        return false;
      }
    }

    return true;
  }

  private async handleHttp(context: HttpExecutionContext): Promise<GuardDecision> {
    const route = context.getRoute();
    const requirement = readAccessRequirement(route.controller, route.handlerName);
    if (requirement.isEmpty) {
      return true;
    }
    if (isPublicRoute(route.controller, route.handlerName)) {
      return true;
    }

    const principal = getRequestAuth(context.context);
    if (!principal) {
      throw this.missingPrincipalError('HTTP');
    }

    const tenantId = this.options.tenantResolver(principal);
    return (await this.evaluate(requirement, principal, tenantId)) ? true : this.forbiddenResponse();
  }

  private async handleGraphql(context: GraphqlExecutionContext): Promise<GuardDecision> {
    const resolverClass = context.getResolverClass();
    const handlerName = context.getResolverHandlerName();
    if (!resolverClass) {
      return true;
    }

    const requirement = readAccessRequirement(resolverClass, handlerName);
    if (requirement.isEmpty) {
      return true;
    }
    if (isPublicRoute(resolverClass, handlerName)) {
      return true;
    }

    const principal = getGraphqlPrincipal(context.getContext());
    if (!principal) {
      throw this.missingPrincipalError('GraphQL');
    }

    const tenantId = this.options.tenantResolver(principal);
    return (await this.evaluate(requirement, principal, tenantId)) ? true : this.forbiddenResponse();
  }

  private async handleMicroservice(
    context: MicroservicePrincipalSource & {
      getClass?: () => (new (...args: unknown[]) => unknown) | undefined;
      getHandlerName?: () => string | undefined;
    },
  ): Promise<boolean> {
    const controllerClass = context.getClass?.();
    if (!controllerClass) {
      return true;
    }

    const requirement = readAccessRequirement(controllerClass, context.getHandlerName?.());
    if (requirement.isEmpty) {
      return true;
    }

    // No auth-guard convention exists for message handlers, so a missing principal
    // is a deny (not a config error): the message simply carries no identity.
    const principal = this.options.microservicePrincipalResolver(context);
    if (!principal) {
      return false;
    }

    const tenantId = this.options.tenantResolver(principal);
    return this.evaluate(requirement, principal, tenantId);
  }
}

/**
 * Registers {@link RolesGuard} as a global HTTP + GraphQL guard (idempotent).
 * Microservice apps additionally call
 * `registerMicroserviceGuard(RolesGuard)` from `@nl-framework/microservices`.
 */
export const registerRolesGuard = (): void => {
  if (rolesGuardRegistered) {
    return;
  }
  registerHttpGuard(RolesGuard);
  registerGraphqlGuard(RolesGuard);
  rolesGuardRegistered = true;
};

export const resetRolesGuard = (): void => {
  rolesGuardRegistered = false;
};
