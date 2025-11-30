import type { MiddlewareHandler, RequestContext } from '@nl-framework/http';
import type { BetterAuthSessionPayload } from '../types';
import type { BetterAuthService, BetterAuthSessionOptions } from '../service';
import type { BetterAuthMultiTenantService } from '../multi-tenant.service';
import type { BetterAuthTenantContext } from '../interfaces/multi-tenant-options';

const REQUEST_AUTH_STATE = Symbol.for('@nl-framework/auth/request-state');

type AugmentedRequestContext = RequestContext & {
  [REQUEST_AUTH_STATE]?: BetterAuthSessionPayload | null;
};

export interface BetterAuthMiddlewareOptions extends BetterAuthSessionOptions {
  attach?: boolean;
  requireSession?: boolean;
  onResolved?: (session: BetterAuthSessionPayload | null, context: RequestContext) => void | Promise<void>;
  onUnauthorized?: (context: RequestContext) => Response | Promise<Response>;
}

export interface BetterAuthMultiTenantMiddlewareOptions extends BetterAuthMiddlewareOptions {
  resolveContext?: (context: RequestContext) => BetterAuthTenantContext;
}

export const setRequestAuth = (
  context: RequestContext,
  payload: BetterAuthSessionPayload | null,
): void => {
  (context as AugmentedRequestContext)[REQUEST_AUTH_STATE] = payload;
  (context as RequestContext & { auth?: BetterAuthSessionPayload | null }).auth = payload;
};

export const getRequestAuth = (context: RequestContext): BetterAuthSessionPayload | null =>
  ((context as AugmentedRequestContext)[REQUEST_AUTH_STATE] ?? null);

export const clearRequestAuth = (context: RequestContext): void => {
  delete (context as AugmentedRequestContext)[REQUEST_AUTH_STATE];
  delete (context as RequestContext & { auth?: BetterAuthSessionPayload | null }).auth;
};

export const createBetterAuthMiddleware = (
  service: BetterAuthService,
  options: BetterAuthMiddlewareOptions = {},
): MiddlewareHandler => {
  const attach = options.attach ?? true;
  const requireSession = options.requireSession ?? false;

  return async (context, next) => {
    const session = await service.getSessionOrNull(context.request, options);

    if (!session && requireSession) {
      if (options.onUnauthorized) {
        return options.onUnauthorized(context);
      }
      return new Response('Unauthorized', { status: 401 });
    }

    if (attach) {
      setRequestAuth(context, session);
    }

    if (options.onResolved) {
      await options.onResolved(session, context);
    }

    return next();
  };
};

const defaultTenantContext = (context: RequestContext): BetterAuthTenantContext => ({
  request: context.request,
  headers: context.request.headers,
});

export const createBetterAuthMultiTenantMiddleware = (
  service: BetterAuthMultiTenantService,
  options: BetterAuthMultiTenantMiddlewareOptions = {},
): MiddlewareHandler => {
  const attach = options.attach ?? true;
  const requireSession = options.requireSession ?? false;
  const resolveContext = options.resolveContext ?? defaultTenantContext;

  return async (context, next) => {
    const tenantContext = resolveContext(context);
    const session = await service.getSessionOrNull(context.request, tenantContext, options);

    if (!session && requireSession) {
      if (options.onUnauthorized) {
        return options.onUnauthorized(context);
      }
      return new Response('Unauthorized', { status: 401 });
    }

    if (attach) {
      setRequestAuth(context, session);
    }

    if (options.onResolved) {
      await options.onResolved(session, context);
    }

    return next();
  };
};
