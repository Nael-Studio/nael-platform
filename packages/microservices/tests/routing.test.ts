import { describe, expect, it } from 'bun:test';
import {
  buildDaprSubscriptions,
  buildInvocationRoutes,
  patternToInvocationPath,
  patternToRoute,
  patternToSlug,
  type HandlerDescriptor,
} from '../src/routing';

const handlers: HandlerDescriptor[] = [
  { pattern: 'orders.get', isEvent: false },
  { pattern: 'orders.list', isEvent: false },
  { pattern: 'order.created', isEvent: true },
  { pattern: 'order.shipped', isEvent: true },
];

describe('pattern path encoding', () => {
  it('slugs string patterns verbatim and object patterns deterministically', () => {
    expect(patternToSlug('orders.get')).toBe('orders.get');
    expect(patternToSlug({ svc: 'orders', cmd: 'get' })).toBe('cmd.get.svc.orders');
    // Sort makes it order-independent.
    expect(patternToSlug({ cmd: 'get', svc: 'orders' })).toBe('cmd.get.svc.orders');
  });

  it('builds the deterministic invocation path and route', () => {
    expect(patternToInvocationPath('orders.get')).toBe('_nl/msg/orders.get');
    expect(patternToRoute('orders.get')).toBe('/_nl/msg/orders.get');
  });
});

describe('buildDaprSubscriptions', () => {
  it('emits one entry per @EventPattern handler and none for @MessagePattern', () => {
    const subscriptions = buildDaprSubscriptions(handlers, { pubsubName: 'pubsub' });
    expect(subscriptions).toEqual([
      { pubsubname: 'pubsub', topic: 'order.created', route: '/_nl/msg/order.created' },
      { pubsubname: 'pubsub', topic: 'order.shipped', route: '/_nl/msg/order.shipped' },
    ]);
  });

  it('honors a custom pubsub component name', () => {
    const [first] = buildDaprSubscriptions(handlers, { pubsubName: 'kafka' });
    expect(first?.pubsubname).toBe('kafka');
  });
});

describe('buildInvocationRoutes', () => {
  it('exposes @MessagePattern handlers and NOT @EventPattern handlers for invocation', () => {
    const routes = buildInvocationRoutes(handlers);
    expect(routes.map((r) => r.pattern)).toEqual(['orders.get', 'orders.list']);
    expect(routes.map((r) => r.path)).toEqual(['/_nl/msg/orders.get', '/_nl/msg/orders.list']);
    // Events are never invocable.
    expect(routes.some((r) => r.pattern === 'order.created')).toBe(false);
  });
});
