import { describe, expect, it } from 'bun:test';
import { MetricsCollector } from '../src/metrics/collector';
import { createMetricsSseResponse } from '../src/metrics/sse';

describe('createMetricsSseResponse', () => {
  it('returns an event-stream response and pushes an initial snapshot frame', async () => {
    const collector = new MetricsCollector();
    collector.record({ kind: 'http', name: 'GET /x', durationMs: 5, ok: true, at: Date.now() });

    const response = createMetricsSseResponse(collector, 10_000);
    expect(response.headers.get('content-type')).toContain('text/event-stream');
    expect(response.headers.get('cache-control')).toContain('no-cache');

    const reader = response.body!.getReader();
    const { value } = await reader.read();
    const frame = new TextDecoder().decode(value);

    expect(frame).toContain('event: metrics');
    expect(frame).toContain('"total":1');
    expect(frame.endsWith('\n\n')).toBe(true);

    await reader.cancel();
  });
});
