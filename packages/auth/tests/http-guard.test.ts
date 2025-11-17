import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { Controller, Module } from '@nl-framework/core';
import {
  Get,
  clearHttpGuards,
  clearHttpRouteRegistrars,
  createHttpApplication,
} from '@nl-framework/http';
import { Public, getRequestAuth } from '../src/index';
import { AuthGuard, registerAuthGuard, resetAuthGuard } from '../src/http/guard';
import { normalizeBetterAuthHttpOptions } from '../src/http/options';
import { BetterAuthService } from '../src/service';
import type { BetterAuthSessionPayload } from '../src/types';
import { BETTER_AUTH_HTTP_OPTIONS } from '../src/http/constants';
import type { GraphqlExecutionContext, GraphqlContext } from '@nl-framework/graphql';
import type { GraphQLResolveInfo } from 'graphql';
import type { LoggerFactory } from '@nl-framework/logger';
import type { IncomingMessage } from 'node:http';

class GuardStubService {
  public readonly instance = {};
  public lastRequest: Request | null = null;

  async getSessionOrNull(request: Request): Promise<BetterAuthSessionPayload | null> {
    this.lastRequest = request;
    if (request.headers.get('x-auth') === 'allow') {
      return {
        session: {
          token: 'test-token',
          expiresAt: new Date(Date.now() + 60_000).toISOString(),
        },
        user: {
          id: 'user-1',
          email: 'user@example.com',
        },
      } as unknown as BetterAuthSessionPayload;
    }
    return null;
  }

  async handle(): Promise<Response> {
    return new Response('ok');
  }
}

@Controller('secure')
class SecureController {
  @Get()
  async secure(context: Parameters<typeof getRequestAuth>[0]) {
    const snapshot = getRequestAuth(context);
    return {
      authenticated: Boolean(snapshot),
      user: snapshot?.user ?? null,
    };
  }
}

@Controller('open')
class PublicController {
  @Public()
  @Get()
  info() {
    return { status: 'public' };
  }
}

const guardStub = new GuardStubService();
const guardOptions = normalizeBetterAuthHttpOptions();
const loggerFactoryStub = {
  create: () => ({
    debug() {
      /* noop */
    },
    info() {
      /* noop */
    },
    warn() {
      /* noop */
    },
    error() {
      /* noop */
    },
  }),
} as unknown as LoggerFactory;

@Module({
  controllers: [SecureController, PublicController],
  providers: [
    { provide: GuardStubService, useValue: guardStub },
    { provide: BetterAuthService, useValue: guardStub as unknown as BetterAuthService },
    { provide: BETTER_AUTH_HTTP_OPTIONS, useValue: guardOptions },
    AuthGuard,
  ],
})
class GuardTestModule {}

describe('Auth guard', () => {
  beforeEach(() => {
    clearHttpGuards();
    clearHttpRouteRegistrars();
    resetAuthGuard();
    registerAuthGuard();
    guardStub.lastRequest = null;
  });

  afterEach(async () => {
    clearHttpGuards();
    clearHttpRouteRegistrars();
    resetAuthGuard();
  });

  it('blocks unauthenticated access to guarded routes', async () => {
    const app = await createHttpApplication(GuardTestModule, { port: 0 });
    const server = await app.listen();

    try {
      const response = await fetch(`http://127.0.0.1:${server.port}/secure`);
      expect(response.status).toBe(401);
      expect(response.headers.get('content-type')).toBe('application/json');
    } finally {
      await app.close();
    }
  });

  it('allows authenticated requests and exposes session data', async () => {
    const app = await createHttpApplication(GuardTestModule, { port: 0 });
    const server = await app.listen();

    try {
      const response = await fetch(`http://127.0.0.1:${server.port}/secure`, {
        headers: {
          'x-auth': 'allow',
        },
      });

      expect(response.status).toBe(200);
      const payload = await response.json();
      expect(payload.authenticated).toBe(true);
      expect(payload.user).toMatchObject({ id: 'user-1' });
    } finally {
      await app.close();
    }
  });

  it('honors the @Public decorator to bypass guards', async () => {
    const app = await createHttpApplication(GuardTestModule, { port: 0 });
    const server = await app.listen();

    try {
      const response = await fetch(`http://127.0.0.1:${server.port}/open`);
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ status: 'public' });
    } finally {
      await app.close();
    }
  });
});

const createGraphqlExecutionContext = (
  req: IncomingMessage,
  contextOverrides: Partial<GraphqlContext> = {},
): GraphqlExecutionContext => {
  const graphqlContext = {
    req,
    res: undefined,
    ...contextOverrides,
  } as GraphqlContext;

  const info = {
    fieldName: 'sampleField',
    parentType: { name: 'Query' },
  } as unknown as GraphQLResolveInfo;

  const resolverClass = class TestResolver {};

  return {
    details: {
      parent: null,
      args: {},
      context: graphqlContext,
      info,
      resolverClass,
      resolverHandlerName: 'sampleField',
    },
    getContext: <T extends GraphqlContext = GraphqlContext>() => graphqlContext as T,
    getArgs: <TArgs extends Record<string, unknown> = Record<string, unknown>>() => ({} as TArgs),
    getInfo: () => info,
    getParent: <TParent = unknown>() => null as TParent,
    getResolverClass: () => resolverClass,
    getResolverHandlerName: () => 'sampleField',
    resolve: async () => {
      throw new Error('Not implemented');
    },
  } satisfies GraphqlExecutionContext;
};

const createIncomingMessage = (
  headers: Record<string, string | string[]>,
  url = '/graphql',
): IncomingMessage =>
  ({
    headers,
    url,
    method: 'POST',
  } as unknown as IncomingMessage);

describe('Auth guard forwarded header handling', () => {
  it('falls back to request host when forwarded host is not trusted', async () => {
    const service = new GuardStubService();
    const guard = new AuthGuard(
      service as unknown as BetterAuthService,
      loggerFactoryStub,
      normalizeBetterAuthHttpOptions(),
    );

    const context = createGraphqlExecutionContext(
      createIncomingMessage({
        host: 'internal.example:4000',
        'x-forwarded-host': 'attacker.example',
        'x-forwarded-proto': 'https',
      }),
    );

    const result = await guard.canActivate(context);

    expect(result instanceof Response).toBe(true);
    expect(service.lastRequest?.url).toBe('https://internal.example:4000/graphql');
  });

  it('honors trusted forwarded protocol and host overrides', async () => {
    const service = new GuardStubService();
    const guard = new AuthGuard(
      service as unknown as BetterAuthService,
      loggerFactoryStub,
      normalizeBetterAuthHttpOptions({
        trustedProxy: {
          hosts: ['app.example.com'],
          protocols: ['https'],
        },
      }),
    );

    const context = createGraphqlExecutionContext(
      createIncomingMessage({
        host: 'internal.example:4000',
        'x-forwarded-host': 'app.example.com',
        'x-forwarded-proto': 'https',
      }),
    );

    const result = await guard.canActivate(context);

    expect(result instanceof Response).toBe(true);
    expect(service.lastRequest?.url).toBe('https://app.example.com/graphql');
  });
});
