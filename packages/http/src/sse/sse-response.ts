export interface SseMessage {
  /** Event payload. Non-strings are JSON-serialized. */
  data: unknown;
  /** Optional `event:` name. */
  event?: string;
  /** Optional `id:` for last-event-id resumption. */
  id?: string;
  /** Optional client reconnect hint in ms (`retry:`). */
  retry?: number;
}

/** A callback source: receives an emitter, returns an optional cleanup fn. */
export type SseSubscribe = (
  emit: (message: SseMessage) => void,
) => void | (() => void) | Promise<void | (() => void)>;

export type SseSource = AsyncIterable<SseMessage> | SseSubscribe;

export interface SseResponseOptions {
  /** Heartbeat comment interval in ms to keep the connection alive. Default 15000. Set 0 to disable. */
  heartbeatMs?: number;
  /** Extra response headers. */
  headers?: Record<string, string>;
}

const encoder = new TextEncoder();

const encodeMessage = (message: SseMessage): Uint8Array => {
  const lines: string[] = [];
  if (message.event) {
    lines.push(`event: ${message.event}`);
  }
  if (message.id) {
    lines.push(`id: ${message.id}`);
  }
  if (message.retry !== undefined) {
    lines.push(`retry: ${message.retry}`);
  }
  const data = typeof message.data === 'string' ? message.data : JSON.stringify(message.data);
  for (const line of data.split('\n')) {
    lines.push(`data: ${line}`);
  }
  return encoder.encode(`${lines.join('\n')}\n\n`);
};

const isAsyncIterable = (source: SseSource): source is AsyncIterable<SseMessage> =>
  typeof (source as AsyncIterable<SseMessage>)[Symbol.asyncIterator] === 'function';

/**
 * A first-class Server-Sent Events response. Return one from a route handler and
 * the router streams it with the correct headers, a keep-alive heartbeat, and
 * automatic cleanup when the client disconnects.
 *
 * ```ts
 * @Get('/events')
 * events() {
 *   return new SseResponse((emit) => {
 *     const t = setInterval(() => emit({ event: 'tick', data: { at: Date.now() } }), 1000);
 *     return () => clearInterval(t);
 *   });
 * }
 * ```
 */
export class SseResponse {
  constructor(
    private readonly source: SseSource,
    private readonly options: SseResponseOptions = {},
  ) {}

  /** Materialize the streaming `Response`. Called by the router. */
  toResponse(): Response {
    const { source } = this;
    const heartbeatMs = this.options.heartbeatMs ?? 15_000;
    let heartbeat: ReturnType<typeof setInterval> | undefined;
    let cleanup: (() => void) | undefined;
    let closed = false;

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const safeEnqueue = (chunk: Uint8Array): void => {
          if (closed) {
            return;
          }
          try {
            controller.enqueue(chunk);
          } catch {
            closed = true;
          }
        };

        if (heartbeatMs > 0) {
          heartbeat = setInterval(() => safeEnqueue(encoder.encode(': ping\n\n')), heartbeatMs);
          (heartbeat as { unref?: () => void }).unref?.();
        }

        if (isAsyncIterable(source)) {
          try {
            for await (const message of source) {
              if (closed) {
                break;
              }
              safeEnqueue(encodeMessage(message));
            }
          } catch {
            // Source threw — end the stream.
          }
          if (!closed) {
            try {
              controller.close();
            } catch {
              /* already closed */
            }
          }
          if (heartbeat) {
            clearInterval(heartbeat);
          }
        } else {
          const maybeCleanup = await source((message) => safeEnqueue(encodeMessage(message)));
          cleanup = typeof maybeCleanup === 'function' ? maybeCleanup : undefined;
        }
      },
      cancel() {
        closed = true;
        if (heartbeat) {
          clearInterval(heartbeat);
        }
        cleanup?.();
      },
    });

    return new Response(stream, {
      headers: {
        'content-type': 'text/event-stream; charset=utf-8',
        'cache-control': 'no-cache, no-transform',
        connection: 'keep-alive',
        'x-accel-buffering': 'no',
        ...this.options.headers,
      },
    });
  }
}
