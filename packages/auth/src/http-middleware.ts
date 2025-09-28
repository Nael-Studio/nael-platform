import type { MiddlewareHandler } from '@nl-framework/http';
import type { BetterAuthService } from './better-auth.service';
import type { MiddlewareAuthorizationOptions, BetterAuthSession } from './interfaces';

const AUTH_CONTEXT_KEY = Symbol.for('nl:auth:session');

const extractBearerToken = (value: string): string | null => {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (trimmed.toLowerCase().startsWith('bearer ')) {
    return trimmed.slice(7).trim();
  }

  return trimmed;
};

export interface AuthenticatedContext {
  [AUTH_CONTEXT_KEY]?: {
    token: string;
    session: BetterAuthSession;
  };
}

export const getAuthTokenFromContext = (ctx: object): string | undefined =>
  (ctx as AuthenticatedContext)[AUTH_CONTEXT_KEY]?.token;

export const getAuthSessionFromContext = (ctx: object): BetterAuthSession | undefined =>
  (ctx as AuthenticatedContext)[AUTH_CONTEXT_KEY]?.session;

export const createBetterAuthMiddleware = (
  authService: BetterAuthService,
  options: MiddlewareAuthorizationOptions = {},
): MiddlewareHandler => {
  const headerName = options.headerName ?? 'authorization';

  return async (ctx, next) => {
  const headerValue = ctx.request.headers.get(headerName);
    const token = headerValue ? extractBearerToken(headerValue) : null;

    if (!token) {
      return new Response('Unauthorized', { status: 401 });
    }

  const session = await authService.resolveSession(token);
    if (!session) {
      return new Response('Unauthorized', { status: 401 });
    }

    const authorized = await authService.authorize(session, { roles: options.requiredRoles });
    if (!authorized) {
      return new Response('Forbidden', { status: 403 });
    }

  (ctx as AuthenticatedContext)[AUTH_CONTEXT_KEY] = { token, session };
    return next();
  };
};
