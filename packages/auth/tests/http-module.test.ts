import { beforeEach, describe, expect, it } from 'bun:test';
import { Logger } from '@nl-framework/logger';
import {
  clearHttpRouteRegistrars,
  listHttpRouteRegistrars,
  type HttpRouteRegistrationApi,
} from '@nl-framework/http';
import { registerBetterAuthHttpRoutes } from '../src/http/routes';
import { normalizeBetterAuthHttpOptions } from '../src/http/options';
import type { BetterAuthService } from '../src/service';
import type { RequestContext } from '@nl-framework/http';

class StubBetterAuthService {
  public readonly instance: {
    api: Record<string, { path: string; options?: { method?: string | string[] } }>;
  };
  public readonly handled: Request[] = [];

  constructor() {
    this.instance = {
      api: {
        signUp: { path: '/sign-up/email', options: { method: 'POST' } },
        session: { path: '/session', options: { method: ['GET'] } },
      },
    };
  }

  async handle(request: Request): Promise<Response> {
    this.handled.push(request);
    return new Response('ok', {
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  }
}

const createContext = (overrides: Partial<RequestContext> = {}): RequestContext => {
  const headers = overrides.headers ?? new Headers();
  const request = overrides.request ??
    new Request('http://localhost/api/auth/sign-up/email', {
      method: 'POST',
      headers,
    });

  const route = overrides.route ?? {
    controller: class TestController {},
    handlerName: 'handler',
    definition: {
      method: 'POST' as const,
      path: '/api/auth/sign-up/email',
      handlerName: 'handler',
    },
  };

  return {
    request,
    params: overrides.params ?? {},
    query: overrides.query ?? new URLSearchParams(),
    headers,
    body: overrides.body ?? { email: 'user@example.com' },
    route,
    container: overrides.container ?? {
      resolve: async () => {
        throw new Error('not implemented');
      },
    },
  } satisfies RequestContext;
};

describe('BetterAuth HTTP route registration', () => {
  beforeEach(() => {
    clearHttpRouteRegistrars();
  });

  it('registers Better Auth API routes with OPTIONS fallbacks', async () => {
    const service = new StubBetterAuthService();
    const options = normalizeBetterAuthHttpOptions({
      prefix: '/auth/custom',
    });

    registerBetterAuthHttpRoutes(service as unknown as BetterAuthService, options);

    const registrars = listHttpRouteRegistrars();
    expect(registrars).toHaveLength(1);

    const registeredRoutes: Array<{
      method: string;
      path: string;
      handler: (context: RequestContext) => Promise<Response> | Response;
    }> = [];

    const api: HttpRouteRegistrationApi = {
      logger: new Logger({ context: 'Test' }),
      registerRoute: (
        method,
        path,
        handler: (context: RequestContext) => Promise<Response> | Response,
      ) => {
        registeredRoutes.push({ method, path, handler });
      },
      resolve: async () => {
        throw new Error('not implemented');
      },
    };

  const registrar = registrars[0];
  expect(registrar).toBeDefined();
  await registrar!(api);

    expect(registeredRoutes.map((route) => `${route.method} ${route.path}`)).toEqual(
      expect.arrayContaining([
        'POST /auth/custom/sign-up/email',
        'GET /auth/custom/session',
        'OPTIONS /auth/custom/sign-up/email',
        'OPTIONS /auth/custom/session',
      ]),
    );

    const postHandler = registeredRoutes.find((route) => route.method === 'POST');
    expect(postHandler).toBeDefined();

    const context = createContext({
      headers: new Headers({ origin: 'https://app.test' }),
    });

    const response = await postHandler!.handler(context);
    expect(await response.text()).toBe('ok');
    expect(service.handled).toHaveLength(1);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://app.test');
    expect(response.headers.get('Access-Control-Allow-Credentials')).toBe('true');
    expect(response.headers.get('Vary')).toContain('Origin');

    const optionsHandler = registeredRoutes.find((route) => route.method === 'OPTIONS');
    expect(optionsHandler).toBeDefined();

    const optionsResponse = await optionsHandler!.handler(
      createContext({
        request: new Request('http://localhost/api/auth/session', {
          method: 'OPTIONS',
          headers: new Headers({ origin: 'https://api.test', 'access-control-request-method': 'POST' }),
        }),
      }),
    );
    expect(optionsResponse.status).toBe(204);
    expect(optionsResponse.headers.get('Access-Control-Allow-Methods')).toContain('POST');
    expect(optionsResponse.headers.get('Access-Control-Allow-Origin')).toBe('https://api.test');
  });

  it('skips OPTIONS registration when already provided', async () => {
  const service = new StubBetterAuthService();
  const sessionEntry = service.instance.api.session;
  expect(sessionEntry).toBeDefined();
  sessionEntry!.options = { method: ['GET', 'OPTIONS'] };

    const options = normalizeBetterAuthHttpOptions();
    registerBetterAuthHttpRoutes(service as unknown as BetterAuthService, options);

    const registrars = listHttpRouteRegistrars();
    expect(registrars).toHaveLength(1);

    const registeredRoutes: string[] = [];
    const registrar = registrars[0];
    expect(registrar).toBeDefined();
    await registrar!({
      logger: new Logger({ context: 'Test' }),
      registerRoute: (method, path) => {
        registeredRoutes.push(`${method} ${path}`);
      },
      resolve: async () => {
        throw new Error('not implemented');
      },
    });

  const sessionOptionsRoutes = registeredRoutes.filter((route) => route === 'OPTIONS /api/auth/session');
  expect(sessionOptionsRoutes).toHaveLength(1);
  const signupOptionsRoutes = registeredRoutes.filter((route) => route === 'OPTIONS /api/auth/sign-up/email');
  expect(signupOptionsRoutes).toHaveLength(1);
  });

  it('returns 400 when request body cannot be serialized', async () => {
    const service = new StubBetterAuthService();
    const options = normalizeBetterAuthHttpOptions();

    registerBetterAuthHttpRoutes(service as unknown as BetterAuthService, options);

    const registrars = listHttpRouteRegistrars();
    expect(registrars).toHaveLength(1);

    const registeredRoutes: Array<{
      method: string;
      path: string;
      handler: (context: RequestContext) => Promise<Response> | Response;
    }> = [];

    const api: HttpRouteRegistrationApi = {
      logger: new Logger({ context: 'Test' }),
      registerRoute: (
        method,
        path,
        handler: (context: RequestContext) => Promise<Response> | Response,
      ) => {
        registeredRoutes.push({ method, path, handler });
      },
      resolve: async () => {
        throw new Error('not implemented');
      },
    };

    const registrar = registrars[0];
    expect(registrar).toBeDefined();
    await registrar!(api);

    const postHandler = registeredRoutes.find((route) => route.method === 'POST');
    expect(postHandler).toBeDefined();

  const circular: any = {};
    circular.self = circular;

    const response = await postHandler!.handler(
      createContext({
        body: circular,
        headers: new Headers({ origin: 'https://app.test' }),
      }),
    );

    expect(response.status).toBe(400);
    expect(response.headers.get('Content-Type')).toBe('application/json');
    expect(await response.json()).toEqual({ message: 'Invalid request payload' });
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://app.test');
    expect(service.handled).toHaveLength(0);
  });

  it('reconstructs request URLs using trusted forwarded headers', async () => {
    const service = new StubBetterAuthService();
    const options = normalizeBetterAuthHttpOptions({
      trustedProxy: {
        protocols: ['https', 'http'],
        hosts: ['public.example.com'],
      },
    });

    registerBetterAuthHttpRoutes(service as unknown as BetterAuthService, options);

    const registrars = listHttpRouteRegistrars();
    expect(registrars).toHaveLength(1);

    const registeredRoutes: Array<{
      method: string;
      path: string;
      handler: (context: RequestContext) => Promise<Response> | Response;
    }> = [];

    const registrar = registrars[0];
    expect(registrar).toBeDefined();
    await registrar!({
      logger: new Logger({ context: 'Test' }),
      registerRoute: (method, path, handler) => {
        registeredRoutes.push({ method, path, handler });
      },
      resolve: async () => {
        throw new Error('not implemented');
      },
    });

    const postHandler = registeredRoutes.find((route) => route.method === 'POST');
    expect(postHandler).toBeDefined();

    const headers = new Headers({
      host: 'internal.example:8080',
      'x-forwarded-host': 'public.example.com',
      'x-forwarded-proto': 'https',
      origin: 'https://app.test',
    });

    const response = await postHandler!.handler(
      createContext({
        headers,
        request: new Request('http://internal.example:8080/api/auth/sign-up/email', {
          method: 'POST',
          headers,
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(service.handled).toHaveLength(1);
    expect(service.handled[0].url).toBe(
      'https://public.example.com:8080/api/auth/sign-up/email',
    );
  });
});
