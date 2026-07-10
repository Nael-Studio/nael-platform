import { describe, expect, it } from 'bun:test';
import { Controller } from '@nl-framework/core';
import { MetricsCollector } from '../src/metrics/collector';
import { createGraphqlTimingInterceptor, createHttpTimingInterceptor } from '../src/metrics/interceptors';

@Controller('/users')
class UsersController {}

const httpCtx = (method: string, path: string, controller?: unknown) =>
  ({
    getRoute: () => ({ definition: { method, path, handlerName: 'h' }, controller, handlerName: 'h' }),
    getClass: () => controller,
    getRequest: () => new Request('http://localhost/'),
    getContainer: () => ({ resolve: async () => undefined }),
  }) as never;

const gqlCtx = (parent: string, field: string) =>
  ({
    getInfo: () => ({ parentType: { name: parent }, fieldName: field, operation: { operation: 'query' } }),
    getResolverClass: () => undefined,
    getResolverHandlerName: () => undefined,
    getArgs: () => ({}),
    getParent: () => undefined,
    getContext: () => ({}),
    resolve: async () => undefined,
  }) as never;

describe('createHttpTimingInterceptor', () => {
  it('records a sample named by method + full route path', async () => {
    const c = new MetricsCollector();
    const interceptor = createHttpTimingInterceptor(c);
    const result = await interceptor(httpCtx('GET', '/:id', UsersController), {
      handle: async () => ({ ok: true }),
    });

    expect(result).toEqual({ ok: true });
    const snap = c.snapshot(Date.now());
    expect(snap.operations[0]?.name).toBe('GET /users/:id');
    expect(snap.operations[0]?.kind).toBe('http');
    expect(snap.http.errorCount).toBe(0);
  });

  it('marks a thrown handler as an error and rethrows', async () => {
    const c = new MetricsCollector();
    const interceptor = createHttpTimingInterceptor(c);
    await expect(
      interceptor(httpCtx('POST', '/', UsersController), {
        handle: async () => {
          throw new Error('boom');
        },
      }),
    ).rejects.toThrow('boom');
    expect(c.snapshot(Date.now()).http.errorCount).toBe(1);
  });

  it('marks a 5xx Response as an error without throwing', async () => {
    const c = new MetricsCollector();
    const interceptor = createHttpTimingInterceptor(c);
    const res = await interceptor(httpCtx('GET', '/', UsersController), {
      handle: async () => new Response('nope', { status: 503 }),
    });
    expect((res as Response).status).toBe(503);
    expect(c.snapshot(Date.now()).http.errorCount).toBe(1);
  });

  it('falls back to method + path when no controller prefix is available', async () => {
    const c = new MetricsCollector();
    const interceptor = createHttpTimingInterceptor(c);
    await interceptor(httpCtx('GET', '/health'), { handle: async () => 'ok' });
    expect(c.snapshot(Date.now()).operations[0]?.name).toBe('GET /health');
  });
});

describe('createGraphqlTimingInterceptor', () => {
  it('always records root operations', async () => {
    const c = new MetricsCollector();
    const interceptor = createGraphqlTimingInterceptor(c);
    await interceptor(gqlCtx('Query', 'users'), { handle: async () => [] });

    const snap = c.snapshot(Date.now());
    expect(snap.operations[0]?.name).toBe('Query.users');
    expect(snap.graphql.count).toBe(1);
  });

  it('records a non-root field resolver that takes real time', async () => {
    const c = new MetricsCollector();
    const interceptor = createGraphqlTimingInterceptor(c);
    await interceptor(gqlCtx('User', 'posts'), {
      handle: async () => {
        await new Promise((resolve) => setTimeout(resolve, 4));
        return [];
      },
    });
    expect(c.snapshot(Date.now()).operations.some((o) => o.name === 'User.posts')).toBe(true);
  });

  it('marks a thrown resolver as an error and rethrows', async () => {
    const c = new MetricsCollector();
    const interceptor = createGraphqlTimingInterceptor(c);
    await expect(
      interceptor(gqlCtx('Mutation', 'createUser'), {
        handle: async () => {
          throw new Error('gql boom');
        },
      }),
    ).rejects.toThrow('gql boom');
    expect(c.snapshot(Date.now()).graphql.errorCount).toBe(1);
  });
});
