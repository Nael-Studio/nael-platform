import type { MiddlewareHandler, RequestContext } from '@nl-framework/http';
import type { BetterAuthSessionPayload } from '../types';
import type { BetterAuthService, BetterAuthSessionOptions } from '../service';

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
