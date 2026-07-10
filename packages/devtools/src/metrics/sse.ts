import type { MetricsCollector } from './collector';

const encoder = new TextEncoder();

/**
 * Server-Sent Events response streaming metrics snapshots on an interval. Bun
 * passes a `ReadableStream` body straight through the router, so this needs no
 * framework support. The interval is cleared when the client disconnects.
 */
export const createMetricsSseResponse = (
  collector: MetricsCollector,
  intervalMs = 2000,
): Response => {
  let timer: ReturnType<typeof setInterval> | undefined;

  const stream = new ReadableStream({
    start(controller) {
      const push = (): void => {
        try {
          const snapshot = collector.snapshot(Date.now());
          controller.enqueue(encoder.encode(`event: metrics\ndata: ${JSON.stringify(snapshot)}\n\n`));
        } catch {
          // controller closed between ticks — stop pushing.
          if (timer) clearInterval(timer);
        }
      };
      push();
      timer = setInterval(push, intervalMs);
      // Don't keep the process alive solely for this stream.
      (timer as { unref?: () => void }).unref?.();
    },
    cancel() {
      if (timer) clearInterval(timer);
    },
  });

  return new Response(stream, {
    headers: {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache, no-transform',
      'x-accel-buffering': 'no',
    },
  });
};
