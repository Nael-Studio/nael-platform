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

class GuardStubService {
  public readonly instance = {};

  async getSessionOrNull(request: Request): Promise<BetterAuthSessionPayload | null> {
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
