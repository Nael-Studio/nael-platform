import { afterEach, describe, expect, it } from 'bun:test';
import { Controller, Module } from '@nl-framework/core';
import {
  clearExceptionFilters,
  clearHttpGuards,
  clearHttpInterceptors,
  clearHttpRouteRegistrars,
  createHttpApplication,
  createThrottleGuard,
  Get,
  registerHttpGuard,
  SkipThrottle,
  Throttle,
  type HttpApplication,
  type ThrottleGuardOptions,
} from '../src/index';

const ORIGIN = 'http://rl.local';

@Controller('/api')
class ApiController {
  @Get('/limited')
  @Throttle({ limit: 2, windowMs: 1000 })
  limited() {
    return { ok: true };
  }

  @Get('/other')
  @Throttle({ limit: 5, windowMs: 1000 })
  other() {
    return { ok: true };
  }

  @Get('/open')
  @SkipThrottle()
  open() {
    return { ok: true };
  }
}

@Module({ controllers: [ApiController] })
class ApiModule {}

const reset = () => {
  clearHttpGuards();
  clearHttpInterceptors();
  clearHttpRouteRegistrars();
  clearExceptionFilters();
};

describe('HTTP rate limiting', () => {
  let app: HttpApplication | undefined;
  let clock = 0;

  const boot = async (options: Partial<ThrottleGuardOptions> = {}) => {
    reset();
    clock = 0;
    registerHttpGuard(createThrottleGuard({ now: () => clock, ...options }));
    app = await createHttpApplication(ApiModule);
    return app;
  };

  const hit = (path: string, headers?: Record<string, string>) =>
    app!.handle(new Request(`${ORIGIN}${path}`, { headers }));

  afterEach(async () => {
    await app?.close();
    app = undefined;
    reset();
  });

  it('allows requests under the limit and blocks over it', async () => {
    await boot();
    expect((await hit('/api/limited')).status).toBe(200);
    expect((await hit('/api/limited')).status).toBe(200);
    const blocked = await hit('/api/limited');
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get('retry-after')).toBeTruthy();
  });

  it('resets after the window elapses', async () => {
    await boot();
    await hit('/api/limited');
    await hit('/api/limited');
    expect((await hit('/api/limited')).status).toBe(429);
    clock += 1000; // advance into the next fixed window
    expect((await hit('/api/limited')).status).toBe(200);
  });

  it('isolates counts per route', async () => {
    await boot();
    await hit('/api/limited');
    await hit('/api/limited');
    expect((await hit('/api/limited')).status).toBe(429);
    // A different route with its own limit is unaffected.
    expect((await hit('/api/other')).status).toBe(200);
  });

  it('isolates counts per client key', async () => {
    await boot();
    await hit('/api/limited', { 'x-forwarded-for': '1.1.1.1' });
    await hit('/api/limited', { 'x-forwarded-for': '1.1.1.1' });
    expect((await hit('/api/limited', { 'x-forwarded-for': '1.1.1.1' })).status).toBe(429);
    // Different client → fresh budget.
    expect((await hit('/api/limited', { 'x-forwarded-for': '2.2.2.2' })).status).toBe(200);
  });

  it('honours a custom keyResolver', async () => {
    await boot({ keyResolver: (ctx) => ctx.getRequest().headers.get('x-api-key') ?? 'anon' });
    await hit('/api/limited', { 'x-api-key': 'k1' });
    await hit('/api/limited', { 'x-api-key': 'k1' });
    expect((await hit('/api/limited', { 'x-api-key': 'k1' })).status).toBe(429);
    expect((await hit('/api/limited', { 'x-api-key': 'k2' })).status).toBe(200);
  });

  it('skips throttling for @SkipThrottle routes', async () => {
    await boot({ default: { limit: 1, windowMs: 1000 } });
    for (let i = 0; i < 5; i += 1) {
      expect((await hit('/api/open')).status).toBe(200);
    }
  });

  it('leaves un-throttled routes alone when no default is set', async () => {
    await boot();
    @Controller('/plain')
    class PlainController {
      @Get('/')
      root() {
        return { ok: true };
      }
    }
    @Module({ controllers: [PlainController] })
    class PlainModule {}
    await app?.close();
    app = await createHttpApplication(PlainModule);
    for (let i = 0; i < 10; i += 1) {
      expect((await app.handle(new Request(`${ORIGIN}/plain`))).status).toBe(200);
    }
  });
});
