import { SseResponse } from '@nl-framework/http';
import type { DevtoolsBus } from './bus';

/**
 * Streams instrumentation events (fresh requests, live logs, queries, exceptions)
 * to the dashboard via SSE. Subscribes to the bus for the life of the connection
 * and unsubscribes on client disconnect — so a closed dashboard leaves no listener
 * behind (keeping the "disarmed = zero subscribers" invariant honest).
 */
export const createInstrumentationSseResponse = (bus: DevtoolsBus): Response =>
  new SseResponse((emit) => {
    const unsubscribe = bus.subscribe((event) => {
      emit({ event: event.type, data: event });
    });
    return () => unsubscribe();
  }).toResponse();
