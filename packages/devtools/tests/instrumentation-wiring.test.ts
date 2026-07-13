import { describe, expect, it } from 'bun:test';
import { RequestContext, createRequestContextData } from '@nl-framework/core';
import type { HttpExecutionContext, CallHandler } from '@nl-framework/http';
import {
  DevtoolsBus,
  createHttpRequestInterceptor,
  DevtoolsLoggerTransport,
  createOrmQueryObserver,
} from '../src/instrumentation';

class DemoController {}

const fakeHttpContext = (method: string, path: string): HttpExecutionContext =>
  ({
    getRoute: () => ({ controller: DemoController, handlerName: 'handle', definition: { method, path } }),
  }) as unknown as HttpExecutionContext;

describe('devtools instrumentation wiring', () => {
  it('captures a full HTTP request timeline: request + handler step + log + ORM query', async () => {
    const bus = new DevtoolsBus();
    bus.arm();

    const interceptor = createHttpRequestInterceptor(bus);
    const logTransport = new DevtoolsLoggerTransport(bus);
    const ormObserver = createOrmQueryObserver(bus);

    // The handler does work while the ambient RequestContext is active: logs a
    // line and issues a query — both should join this request by requestId.
    const workingHandler: CallHandler = {
      handle: async () => {
        logTransport.log({ level: 'INFO', message: 'handling demo', timestamp: new Date() });
        ormObserver.onQuery({
          collection: 'users',
          op: 'find',
          filterShape: { tenantId: '…' },
          durationMs: 4,
          count: 2,
          at: Date.now(),
        });
        return new Response('ok', { status: 200 });
      },
    };

    const ctxData = createRequestContextData({ kind: 'http', name: 'GET /demo', requestId: 'req-1' });

    await RequestContext.run(ctxData, () =>
      interceptor(fakeHttpContext('GET', '/demo'), workingHandler),
    );

    const detail = bus.getRequest('req-1');
    expect(detail).toBeDefined();
    expect(detail?.status).toBe('ok');
    expect(detail?.httpStatus).toBe(200);
    expect(detail?.name).toBe('GET /demo');
    expect(detail?.steps.some((s) => s.step === 'handler')).toBe(true);
    expect(detail?.logs.map((l) => l.message)).toContain('handling demo');
    expect(detail?.queries.map((q) => q.collection)).toContain('users');
    // ORM query filter shape carries keys but never values.
    expect(detail?.queries[0].filterShape).toEqual({ tenantId: '…' });
  });

  it('records an errored request when the handler throws', async () => {
    const bus = new DevtoolsBus();
    bus.arm();
    const interceptor = createHttpRequestInterceptor(bus);
    const failing: CallHandler = {
      handle: async () => {
        throw new Error('boom');
      },
    };

    const ctxData = createRequestContextData({ kind: 'http', name: 'GET /fail', requestId: 'req-2' });
    await expect(
      RequestContext.run(ctxData, () => interceptor(fakeHttpContext('GET', '/fail'), failing)),
    ).rejects.toThrow('boom');

    const detail = bus.getRequest('req-2');
    expect(detail?.status).toBe('error');
    expect(detail?.exceptions[0]?.message).toBe('boom');
    expect(detail?.steps[0]?.outcome).toBe('throw');
  });
});
