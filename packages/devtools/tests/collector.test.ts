import { describe, expect, it } from 'bun:test';
import { MetricsCollector } from '../src/metrics/collector';

const at = 1_700_000_000_000;

describe('MetricsCollector', () => {
  it('aggregates per-operation percentiles and error rate', () => {
    const c = new MetricsCollector(1000);
    for (const ms of [10, 20, 30, 40, 100]) {
      c.record({ kind: 'http', name: 'GET /users', durationMs: ms, ok: ms !== 100, at });
    }
    const snap = c.snapshot(at + 1000);

    expect(snap.total).toBe(5);
    expect(snap.sampleCount).toBe(5);
    const op = snap.operations.find((o) => o.name === 'GET /users');
    expect(op).toBeDefined();
    expect(op?.count).toBe(5);
    expect(op?.errorCount).toBe(1);
    expect(op?.max).toBe(100);
    expect(op?.p50).toBe(30);
    expect(op?.p99).toBe(100);
    expect(snap.errorRate).toBe(0.2);
  });

  it('separates http and graphql summaries', () => {
    const c = new MetricsCollector();
    c.record({ kind: 'http', name: 'GET /a', durationMs: 5, ok: true, at });
    c.record({ kind: 'graphql', name: 'Query.b', durationMs: 50, ok: true, at });
    c.record({ kind: 'graphql', name: 'Query.b', durationMs: 70, ok: false, at });
    const snap = c.snapshot(at + 100);

    expect(snap.http.count).toBe(1);
    expect(snap.graphql.count).toBe(2);
    expect(snap.graphql.errorCount).toBe(1);
  });

  it('evicts oldest samples beyond capacity but keeps a lifetime total', () => {
    const c = new MetricsCollector(3);
    for (let i = 0; i < 10; i++) {
      c.record({ kind: 'http', name: 'GET /x', durationMs: i, ok: true, at: at + i });
    }
    const snap = c.snapshot(at + 100);
    expect(snap.sampleCount).toBe(3);
    expect(snap.capacity).toBe(3);
    expect(snap.total).toBe(10);
  });

  it('counts throughput only within the trailing 60s window', () => {
    const c = new MetricsCollector();
    c.record({ kind: 'http', name: 'GET /x', durationMs: 1, ok: true, at: at - 120_000 });
    c.record({ kind: 'http', name: 'GET /x', durationMs: 1, ok: true, at: at - 1_000 });
    c.record({ kind: 'http', name: 'GET /x', durationMs: 1, ok: true, at: at - 500 });
    expect(c.snapshot(at).throughputPerMin).toBe(2);
  });

  it('reconfiguring capacity resets the buffer', () => {
    const c = new MetricsCollector(10);
    c.record({ kind: 'http', name: 'GET /x', durationMs: 1, ok: true, at });
    c.configure(50);
    const snap = c.snapshot(at + 1);
    expect(snap.capacity).toBe(50);
    expect(snap.sampleCount).toBe(0);
  });

  it('returns recent ops most-recent-first', () => {
    const c = new MetricsCollector();
    c.record({ kind: 'http', name: 'GET /1', durationMs: 1, ok: true, at });
    c.record({ kind: 'http', name: 'GET /2', durationMs: 1, ok: true, at });
    const snap = c.snapshot(at + 1);
    expect(snap.recent[0]?.name).toBe('GET /2');
    expect(snap.recent[1]?.name).toBe('GET /1');
  });
});
