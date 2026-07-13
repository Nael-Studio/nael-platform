import { afterEach, describe, expect, it } from 'bun:test';
import { Controller, Module } from '@nl-framework/core';
import {
  clearExceptionFilters,
  clearHttpGuards,
  clearHttpInterceptors,
  clearHttpRouteRegistrars,
  createHttpApplication,
  Get,
  normalizeCorsOptions,
  type HttpApplication,
  type HttpApplicationOptions,
} from '../src/index';

const ORIGIN = 'http://api.local';

@Controller('/w')
class WidgetController {
  @Get('/')
  list() {
    return { ok: true };
  }

  @Get('/framed')
  framed() {
    // Handler sets its own X-Frame-Options — security merge must not overwrite it.
    return new Response('custom', { headers: { 'X-Frame-Options': 'SAMEORIGIN' } });
  }
}

@Module({ controllers: [WidgetController] })
class WidgetModule {}

const reset = () => {
  clearHttpGuards();
  clearHttpInterceptors();
  clearHttpRouteRegistrars();
  clearExceptionFilters();
};

describe('HTTP CORS', () => {
  let app: HttpApplication | undefined;
  const boot = async (options: HttpApplicationOptions) => {
    reset();
    app = await createHttpApplication(WidgetModule, options);
    return app;
  };
  afterEach(async () => {
    await app?.close();
    app = undefined;
    reset();
  });

  it('answers a preflight with 204 and CORS headers', async () => {
    await boot({ cors: { origin: 'http://app.local', methods: ['GET', 'POST'], maxAge: 600 } });
    const res = await app!.handle(
      new Request(`${ORIGIN}/w`, {
        method: 'OPTIONS',
        headers: {
          origin: 'http://app.local',
          'access-control-request-method': 'POST',
          'access-control-request-headers': 'content-type',
        },
      }),
    );
    expect(res.status).toBe(204);
    expect(res.headers.get('access-control-allow-origin')).toBe('http://app.local');
    expect(res.headers.get('access-control-allow-methods')).toContain('POST');
    expect(res.headers.get('access-control-allow-headers')).toBe('content-type');
    expect(res.headers.get('access-control-max-age')).toBe('600');
  });

  it('adds CORS headers to a simple request', async () => {
    await boot({ cors: true });
    const res = await app!.handle(new Request(`${ORIGIN}/w`, { headers: { origin: 'http://anywhere.local' } }));
    expect(res.status).toBe(200);
    expect(res.headers.get('access-control-allow-origin')).toBe('*');
  });

  it('reflects a specific origin when credentials are enabled', async () => {
    await boot({ cors: { origin: ['http://app.local'], credentials: true } });
    const res = await app!.handle(new Request(`${ORIGIN}/w`, { headers: { origin: 'http://app.local' } }));
    expect(res.headers.get('access-control-allow-origin')).toBe('http://app.local');
    expect(res.headers.get('access-control-allow-credentials')).toBe('true');
    expect(res.headers.get('vary')).toContain('Origin');
  });

  it('omits headers for a disallowed origin (not an error)', async () => {
    await boot({ cors: { origin: 'http://app.local' } });
    const res = await app!.handle(new Request(`${ORIGIN}/w`, { headers: { origin: 'http://evil.local' } }));
    expect(res.status).toBe(200);
    expect(res.headers.get('access-control-allow-origin')).toBeNull();
  });

  it('throws at config time for credentials + wildcard', () => {
    expect(() => normalizeCorsOptions({ origin: '*', credentials: true })).toThrow();
  });

  it('supports a function origin matcher', async () => {
    await boot({ cors: { origin: (o) => o.endsWith('.trusted.local') } });
    const ok = await app!.handle(new Request(`${ORIGIN}/w`, { headers: { origin: 'http://a.trusted.local' } }));
    expect(ok.headers.get('access-control-allow-origin')).toBe('http://a.trusted.local');
    const no = await app!.handle(new Request(`${ORIGIN}/w`, { headers: { origin: 'http://a.other.local' } }));
    expect(no.headers.get('access-control-allow-origin')).toBeNull();
  });
});

describe('HTTP security headers', () => {
  let app: HttpApplication | undefined;
  const boot = async (options: HttpApplicationOptions) => {
    reset();
    app = await createHttpApplication(WidgetModule, options);
    return app;
  };
  afterEach(async () => {
    await app?.close();
    app = undefined;
    reset();
  });

  it('applies helmet-core defaults', async () => {
    await boot({ security: true });
    const res = await app!.handle(new Request(`${ORIGIN}/w`));
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect(res.headers.get('x-frame-options')).toBe('DENY');
    expect(res.headers.get('referrer-policy')).toBe('no-referrer');
    // HSTS not forced unless configured.
    expect(res.headers.get('strict-transport-security')).toBeNull();
  });

  it('emits HSTS and CSP when configured', async () => {
    await boot({
      security: { hsts: { maxAge: 100, includeSubDomains: true }, csp: "default-src 'self'" },
    });
    const res = await app!.handle(new Request(`${ORIGIN}/w`));
    expect(res.headers.get('strict-transport-security')).toBe('max-age=100; includeSubDomains');
    expect(res.headers.get('content-security-policy')).toBe("default-src 'self'");
  });

  it('never overwrites a handler-set header', async () => {
    await boot({ security: true });
    const res = await app!.handle(new Request(`${ORIGIN}/w/framed`));
    expect(res.headers.get('x-frame-options')).toBe('SAMEORIGIN');
    // Other defaults still merged in.
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
  });

  it('is off by default (no headers added)', async () => {
    await boot({});
    const res = await app!.handle(new Request(`${ORIGIN}/w`));
    expect(res.headers.get('x-content-type-options')).toBeNull();
    expect(res.headers.get('x-frame-options')).toBeNull();
  });
});
