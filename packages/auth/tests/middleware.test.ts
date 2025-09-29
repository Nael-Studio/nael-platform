import { describe, expect, it } from 'bun:test';
import type { MiddlewareHandler, RequestContext } from '@nl-framework/http';
import { createBetterAuthMiddleware, getRequestAuth } from '../src/http/middleware';
import type { BetterAuthService } from '../src/service';
import type { BetterAuthSessionPayload } from '../src/types';

const createContext = (): RequestContext => ({
  request: new Request('http://localhost/profile'),
  params: {},
  query: new URLSearchParams(),
  headers: new Headers(),
  body: undefined,
  route: {} as RequestContext['route'],
  container: {
    resolve: async () => {
      throw new Error('not implemented');
    },
  },
});

describe('createBetterAuthMiddleware', () => {
  it('attaches the resolved session and calls next middleware', async () => {
    const session = {
      session: {
        token: 'token',
        expiresAt: new Date(Date.now() + 60_000),
      },
      user: {
        id: 'user-id',
        email: 'user@example.com',
      },
    } as unknown as BetterAuthSessionPayload;

    const service = {
      getSessionOrNull: async () => session,
    } as unknown as BetterAuthService;

    const middleware = createBetterAuthMiddleware(service);

    const context = createContext();
    let nextCalled = false;

    const response = await middleware(context, async () => {
      nextCalled = true;
      return new Response('ok');
    });

    expect(nextCalled).toBe(true);
    expect(response.status).toBe(200);
    expect(getRequestAuth(context)).toEqual(session);
  });

  it('short-circuits with 401 when no session and requireSession is true', async () => {
    const service = {
      getSessionOrNull: async () => null,
    } as unknown as BetterAuthService;

    const middleware = createBetterAuthMiddleware(service, { requireSession: true });

    const context = createContext();

    const response = await middleware(context, async () => new Response('ok'));

    expect(response.status).toBe(401);
  });

  it('invokes onUnauthorized callback when provided', async () => {
    const service = {
      getSessionOrNull: async () => null,
    } as unknown as BetterAuthService;

    const customResponse = new Response('custom', { status: 418 });
    const middleware: MiddlewareHandler = createBetterAuthMiddleware(service, {
      requireSession: true,
      onUnauthorized: () => customResponse,
    });

    const response = await middleware(createContext(), async () => new Response('ok'));

    expect(response).toBe(customResponse);
    expect(response.status).toBe(418);
  });
});
