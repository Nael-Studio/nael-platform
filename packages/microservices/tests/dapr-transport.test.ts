import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { DaprTransport } from '../src/transport/dapr-transport';
import { MicroserviceInvocationException } from '../src/exceptions/microservice-invocation.exception';

type FetchArgs = { url: string; init: RequestInit };
const originalFetch = globalThis.fetch;

/** Install a fetch stub that records calls and returns queued responses. */
const stubFetch = (handler: (url: string, init: RequestInit) => Response | Promise<Response>) => {
  const calls: FetchArgs[] = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = typeof input === 'string' ? input : input.toString();
    calls.push({ url, init });
    return handler(url, init);
  }) as typeof fetch;
  return calls;
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

const healthy = () => new Response(null, { status: 204 });

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('DaprTransport.connect (health check)', () => {
  it('resolves once the sidecar healthz responds ok', async () => {
    const calls = stubFetch(() => healthy());
    const transport = new DaprTransport({ daprHttpPort: 3500, healthCheck: { retries: 5, intervalMs: 1 } });

    await transport.connect();

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe('http://localhost:3500/v1.0/healthz');
  });

  it('retries then fails with an actionable message when the sidecar never comes up', async () => {
    const calls = stubFetch(() => {
      throw new Error('ECONNREFUSED');
    });
    const transport = new DaprTransport({ healthCheck: { retries: 3, intervalMs: 1 } });

    await expect(transport.connect()).rejects.toThrow(/Could not reach the Dapr sidecar.*dapr run/s);
    expect(calls).toHaveLength(3);
  });
});

describe('DaprTransport.send (service invocation)', () => {
  const connectedTransport = async (options = {}) => {
    let healthDone = false;
    const calls = stubFetch((url) => {
      if (url.endsWith('/healthz')) {
        healthDone = true;
        return healthy();
      }
      return json({ ok: true, received: url });
    });
    const transport = new DaprTransport({
      appId: 'orders',
      healthCheck: { retries: 1, intervalMs: 1 },
      ...options,
    });
    await transport.connect();
    expect(healthDone).toBe(true);
    return { transport, calls };
  };

  it('invokes the deterministic _nl/msg path and returns the JSON body', async () => {
    const { transport, calls } = await connectedTransport();

    const result = await transport.send<{ ok: boolean }>('orders.get', { id: 7 });

    const invocation = calls.find((c) => c.url.includes('/invoke/'));
    expect(invocation?.url).toBe('http://localhost:3500/v1.0/invoke/orders/method/_nl/msg/orders.get');
    expect(invocation?.init.method).toBe('POST');
    expect(JSON.parse(invocation?.init.body as string)).toEqual({ id: 7 });
    expect(result).toMatchObject({ ok: true });
  });

  it('honors a per-call appId override', async () => {
    const { transport, calls } = await connectedTransport();
    await transport.send('orders.get', {}, { appId: 'billing' });
    const invocation = calls.find((c) => c.url.includes('/invoke/'));
    expect(invocation?.url).toContain('/invoke/billing/method/');
  });

  it('throws MicroserviceInvocationException carrying status and body on non-2xx', async () => {
    stubFetch((url) => (url.endsWith('/healthz') ? healthy() : json({ error: 'boom' }, 503)));
    const transport = new DaprTransport({ appId: 'orders', healthCheck: { retries: 1, intervalMs: 1 } });
    await transport.connect();

    const error = await transport.send('orders.get', {}).then(
      () => {
        throw new Error('expected send to reject');
      },
      (e: unknown) => e as MicroserviceInvocationException,
    );

    expect(error).toBeInstanceOf(MicroserviceInvocationException);
    expect(error.status).toBe(503);
    expect(error.body).toContain('boom');
  });

  it('requires a target app id', async () => {
    stubFetch(() => healthy());
    const transport = new DaprTransport({ healthCheck: { retries: 1, intervalMs: 1 } });
    await transport.connect();
    await expect(transport.send('orders.get', {})).rejects.toThrow(/app id/i);
  });

  it('aborts and reports a timeout when the invocation stalls', async () => {
    stubFetch((url, init) => {
      if (url.endsWith('/healthz')) {
        return healthy();
      }
      // Never resolve until the caller's timeout aborts the request.
      return new Promise<Response>((_resolve, reject) => {
        init.signal?.addEventListener('abort', () =>
          reject(new DOMException('Aborted', 'AbortError')),
        );
      });
    });
    const transport = new DaprTransport({ appId: 'orders', healthCheck: { retries: 1, intervalMs: 1 } });
    await transport.connect();

    await expect(transport.send('orders.get', {}, { timeout: 10 })).rejects.toThrow(/timed out/i);
  });
});
