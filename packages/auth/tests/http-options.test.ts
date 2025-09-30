import { describe, expect, it } from 'bun:test';
import { normalizeBetterAuthHttpOptions } from '../src/http/options';
import type { RequestContext } from '@nl-framework/http';

const createContext = (headers: Record<string, string> = {}): RequestContext => {
  const requestHeaders = new Headers(headers);
  const route = {
    controller: class DummyController {},
    handlerName: 'handler',
    definition: {
      method: 'GET' as const,
      path: '/',
      handlerName: 'handler',
    },
  } satisfies RequestContext['route'];
  return {
    request: new Request('http://localhost/example', {
      method: 'GET',
      headers: requestHeaders,
    }),
    params: {},
    query: new URLSearchParams(),
    headers: requestHeaders,
    body: null,
    route,
    container: {
      resolve: async () => {
        throw new Error('not implemented');
      },
    },
  } satisfies RequestContext;
};

describe('normalizeBetterAuthHttpOptions', () => {
  it('provides sensible defaults', () => {
    const normalized = normalizeBetterAuthHttpOptions();
    expect(normalized.prefix).toBe('/api/auth');
    expect(normalized.handleOptions).toBe(true);
    expect(normalized.trustedProxy.protocols).toEqual(['http']);
    expect(normalized.trustedProxy.hosts).toBeNull();

    const context = createContext({
      origin: 'https://example.com',
      'access-control-request-headers': 'x-custom-header',
      'access-control-request-method': 'POST',
    });

    expect(normalized.cors.allowOrigin(context)).toBe('https://example.com');
    expect(normalized.cors.allowHeaders(context)).toBe('x-custom-header');
    expect(normalized.cors.allowMethods(context)).toBe('POST');
    expect(normalized.cors.allowCredentials).toBe(true);
    expect(normalized.cors.exposeHeaders).toBeUndefined();
    expect(normalized.cors.maxAge).toBeUndefined();
  });

  it('normalizes prefix and custom cors inputs', () => {
    const normalized = normalizeBetterAuthHttpOptions({
      prefix: 'auth/v1/',
      handleOptions: false,
      cors: {
        allowOrigin: 'https://app.local',
        allowHeaders: ['X-Test', 'Authorization'],
        allowMethods: ['POST', 'DELETE'],
        allowCredentials: false,
        exposeHeaders: ['X-Foo'],
        maxAge: 600,
      },
      trustedProxy: {
        protocols: ['https', 'ws'],
        hosts: ['App.local:3000', 'invalid host', '127.0.0.1'],
      },
    });

    expect(normalized.prefix).toBe('/auth/v1');
    expect(normalized.handleOptions).toBe(false);

    const context = createContext();

    expect(normalized.cors.allowOrigin(context)).toBe('https://app.local');
    expect(normalized.cors.allowHeaders(context)).toBe('X-Test,Authorization');
    expect(normalized.cors.allowMethods(context)).toBe('POST,DELETE');
    expect(normalized.cors.allowCredentials).toBe(false);
    expect(normalized.cors.exposeHeaders).toBe('X-Foo');
    expect(normalized.cors.maxAge).toBe(600);
    expect(normalized.trustedProxy.protocols).toEqual(['https']);
    expect(normalized.trustedProxy.hosts).toEqual(['app.local:3000', '127.0.0.1']);
  });

  it('supports functional cors overrides', () => {
    const normalized = normalizeBetterAuthHttpOptions({
      cors: {
        allowOrigin: (ctx) => ctx.request.headers.get('origin') ?? 'https://fallback.local',
        allowHeaders: () => ['Content-Type', 'X-Trace-Id'],
        allowMethods: () => 'PUT',
      },
    });

    const context = createContext();
    expect(normalized.cors.allowOrigin(context)).toBe('https://fallback.local');
    expect(normalized.cors.allowHeaders(context)).toBe('Content-Type,X-Trace-Id');
    expect(normalized.cors.allowMethods(context)).toBe('PUT');
  });

  it('returns null when trusted proxy host list sanitizes to empty', () => {
    const normalized = normalizeBetterAuthHttpOptions({
      trustedProxy: {
        hosts: ['   ', 'bad/host'],
      },
    });

    expect(normalized.trustedProxy.hosts).toBeNull();
    expect(normalized.trustedProxy.protocols).toEqual(['http']);
  });
});
