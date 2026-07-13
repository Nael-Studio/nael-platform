import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { UseGuards } from '@nl-framework/core';
import { EventPattern, MessagePattern } from '../src/decorators/patterns';
import { createMicroserviceRouteRegistrar } from '../src/http/route-registrar';
import { clearMicroserviceGuards } from '../src/guards/registry';
import type { RequestContextLike } from '../src/http/request';

type RouteHandler = (context: RequestContextLike) => unknown | Promise<unknown>;

const events: unknown[] = [];

const denyGuard = () => false;

class OrdersController {
  @MessagePattern('orders.get')
  getOrder(payload: { id: number }) {
    return { id: payload.id, total: 42 };
  }

  @EventPattern('order.created')
  onCreated(payload: unknown) {
    events.push(payload);
  }

  @EventPattern('order.blocked')
  @UseGuards(denyGuard)
  onBlocked() {
    events.push('should-not-run');
  }
}

/** Minimal stand-in for the HTTP route registration API. */
const fakeApi = () => {
  const routes = new Map<string, RouteHandler>();
  const noop = () => {};
  const logger = { info: noop, debug: noop, warn: noop, error: noop } as never;
  return {
    routes,
    api: {
      logger,
      registerRoute: (method: string, path: string, handler: RouteHandler) => {
        routes.set(`${method} ${path}`, handler);
      },
      resolve: async <T>(token: unknown): Promise<T> => new (token as new () => T)(),
    },
  };
};

const ctx = (body: unknown, headers: Record<string, string> = {}): RequestContextLike => ({
  request: new Request('http://svc.local/route', { headers }),
  body,
});

describe('createMicroserviceRouteRegistrar', () => {
  let routes: Map<string, RouteHandler>;

  beforeEach(async () => {
    events.length = 0;
    clearMicroserviceGuards();
    const { routes: r, api } = fakeApi();
    routes = r;
    const registrar = createMicroserviceRouteRegistrar({
      controllers: [OrdersController],
      pubsubName: 'pubsub',
    });
    await registrar(api as never);
  });

  afterEach(() => clearMicroserviceGuards());

  it('serves GET /dapr/subscribe with one entry per event handler', async () => {
    const handler = routes.get('GET /dapr/subscribe');
    expect(handler).toBeDefined();
    const subscriptions = await handler!(ctx(undefined));
    expect(subscriptions).toEqual([
      { pubsubname: 'pubsub', topic: 'order.created', route: '/_nl/msg/order.created' },
      { pubsubname: 'pubsub', topic: 'order.blocked', route: '/_nl/msg/order.blocked' },
    ]);
  });

  it('registers a POST invocation route per message pattern that returns the result', async () => {
    const handler = routes.get('POST /_nl/msg/orders.get');
    expect(handler).toBeDefined();
    const result = await handler!(ctx({ id: 5 }));
    expect(result).toEqual({ id: 5, total: 42 });
  });

  it('delivers a CloudEvent to an event handler and returns SUCCESS', async () => {
    const handler = routes.get('POST /_nl/msg/order.created');
    // Dapr wraps the payload in a CloudEvent envelope.
    const result = await handler!(ctx({ data: { orderId: 9 }, type: 'com.dapr.event' }));
    expect(result).toEqual({ status: 'SUCCESS' });
    expect(events).toEqual([{ orderId: 9 }]);
  });

  it('returns DROP for a guard-denied event without running the handler', async () => {
    const handler = routes.get('POST /_nl/msg/order.blocked');
    const result = await handler!(ctx({ data: {} }));
    expect(result).toEqual({ status: 'DROP' });
    expect(events).not.toContain('should-not-run');
  });
});
