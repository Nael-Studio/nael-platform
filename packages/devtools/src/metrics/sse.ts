import { SseResponse } from '@nl-framework/http';
import type { MetricsCollector } from './collector';

/**
 * Server-Sent Events response streaming metrics snapshots on an interval, built
 * on `@nl-framework/http`'s first-class `SseResponse` (headers, heartbeat, and
 * client-disconnect cleanup are handled by the framework).
 */
export const createMetricsSseResponse = (
  collector: MetricsCollector,
  intervalMs = 2000,
): Response =>
  new SseResponse((emit) => {
    const push = (): void => {
      emit({ event: 'metrics', data: collector.snapshot(Date.now()) });
    };
    push();
    const timer = setInterval(push, intervalMs);
    // Don't keep the process alive solely for this stream.
    (timer as { unref?: () => void }).unref?.();
    return () => clearInterval(timer);
  }).toResponse();
