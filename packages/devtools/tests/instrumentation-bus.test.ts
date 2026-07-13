import { describe, expect, it, beforeEach } from 'bun:test';
import { DevtoolsBus, RingBuffer } from '../src/instrumentation';
import { analyzeQueries, detectNPlusOne } from '../src/instrumentation';
import type { OrmQueryEvent, RequestDetail } from '../src/instrumentation';

const now = 1_000_000;

describe('RingBuffer', () => {
  it('evicts oldest and fires onEvict when full', () => {
    const evicted: number[] = [];
    const buf = new RingBuffer<number>(3, (n) => evicted.push(n));
    [1, 2, 3, 4, 5].forEach((n) => buf.push(n));
    expect(buf.toArray()).toEqual([3, 4, 5]);
    expect(buf.recent()).toEqual([5, 4, 3]);
    expect(evicted).toEqual([1, 2]);
    expect(buf.totalSeen).toBe(5);
    expect(buf.size).toBe(3);
  });
});

describe('DevtoolsBus', () => {
  let bus: DevtoolsBus;
  beforeEach(() => {
    bus = new DevtoolsBus({ requests: 3, steps: 10, queries: 10, exceptions: 10, logs: 10, cache: 10 });
  });

  it('no-ops entirely while disarmed', () => {
    bus.emit({ type: 'request:start', requestId: 'r1', kind: 'http', name: 'GET /a', at: now });
    expect(bus.listRequests()).toEqual([]);
    expect(bus.isArmed()).toBe(false);
  });

  it('assembles a request timeline by requestId once armed', () => {
    bus.arm();
    bus.emit({ type: 'request:start', requestId: 'r1', kind: 'http', name: 'GET /a', at: now });
    bus.emit({ type: 'step', requestId: 'r1', step: 'guard', token: 'AuthGuard', at: now + 1, durationMs: 2, outcome: 'pass' });
    bus.emit({ type: 'orm:query', requestId: 'r1', collection: 'users', op: 'find', filterShape: { tenantId: '…' }, durationMs: 3, count: 2, at: now + 2 });
    bus.emit({ type: 'log', requestId: 'r1', level: 'INFO', message: 'hi', at: now + 3 });
    bus.emit({ type: 'request:end', requestId: 'r1', kind: 'http', name: 'GET /a', at: now + 5, durationMs: 5, status: 200 });

    const detail = bus.getRequest('r1');
    expect(detail?.status).toBe('ok');
    expect(detail?.httpStatus).toBe(200);
    expect(detail?.durationMs).toBe(5);
    expect(detail?.steps).toHaveLength(1);
    expect(detail?.queries).toHaveLength(1);
    expect(detail?.logs).toHaveLength(1);
    // Events are sorted by timestamp.
    expect(detail?.steps[0].token).toBe('AuthGuard');
  });

  it('marks a request errored when request:end carries an error', () => {
    bus.arm();
    bus.emit({ type: 'request:start', requestId: 'r2', kind: 'http', name: 'GET /b', at: now });
    bus.emit({ type: 'request:end', requestId: 'r2', kind: 'http', name: 'GET /b', at: now + 1, durationMs: 1, error: 'Boom' });
    expect(bus.listRequests()[0].status).toBe('error');
  });

  it('filters the request list by kind and status', () => {
    bus.arm();
    bus.emit({ type: 'request:start', requestId: 'h1', kind: 'http', name: 'GET /a', at: now });
    bus.emit({ type: 'request:end', requestId: 'h1', kind: 'http', name: 'GET /a', at: now, durationMs: 1, status: 200 });
    bus.emit({ type: 'request:start', requestId: 'g1', kind: 'graphql', name: 'query me', at: now });
    expect(bus.listRequests({ kind: 'graphql' }).map((r) => r.requestId)).toEqual(['g1']);
    expect(bus.listRequests({ status: 'ok' }).map((r) => r.requestId)).toEqual(['h1']);
  });

  it('evicts old requests and drops them from the by-id index', () => {
    bus.arm();
    for (const id of ['a', 'b', 'c', 'd']) {
      bus.emit({ type: 'request:start', requestId: id, kind: 'http', name: id, at: now });
    }
    expect(bus.getRequest('a')).toBeUndefined(); // evicted (capacity 3)
    expect(bus.getRequest('d')).toBeDefined();
  });

  it('delivers events to subscribers and stops after unsubscribe', () => {
    bus.arm();
    const seen: string[] = [];
    const off = bus.subscribe((e) => seen.push(e.type));
    expect(bus.hasSubscribers()).toBe(true);
    bus.emit({ type: 'log', requestId: 'r', level: 'INFO', message: 'x', at: now });
    off();
    expect(bus.hasSubscribers()).toBe(false);
    bus.emit({ type: 'log', requestId: 'r', level: 'INFO', message: 'y', at: now });
    expect(seen).toEqual(['log']);
  });
});

describe('query analysis', () => {
  const q = (collection: string, durationMs: number, filterShape: Record<string, unknown> = {}): OrmQueryEvent => ({
    type: 'orm:query',
    collection,
    op: 'find',
    filterShape,
    durationMs,
    at: now,
  });

  it('rolls up per collection and surfaces the slowest', () => {
    const analysis = analyzeQueries([q('users', 10), q('users', 30), q('orders', 5)]);
    expect(analysis.total).toBe(3);
    const users = analysis.byCollection.find((c) => c.collection === 'users');
    expect(users?.count).toBe(2);
    expect(users?.totalMs).toBe(40);
    expect(analysis.slowest[0].durationMs).toBe(30);
  });

  it('detects the N+1 smell (same collection+shape >= 3x in one request)', () => {
    const detail: RequestDetail = {
      requestId: 'r',
      kind: 'http',
      name: 'GET /a',
      at: now,
      status: 'ok',
      steps: [],
      logs: [],
      exceptions: [],
      cache: [],
      queries: [q('users', 1, { id: '…' }), q('users', 1, { id: '…' }), q('users', 1, { id: '…' }), q('orders', 1)],
    };
    const flags = detectNPlusOne(detail);
    expect(flags).toHaveLength(1);
    expect(flags[0].collection).toBe('users');
    expect(flags[0].occurrences).toBe(3);
  });
});
