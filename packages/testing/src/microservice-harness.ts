import type {
  MessageDispatcher,
  MessagePatternType,
  Transport,
} from '@nl-framework/microservices';

/**
 * A {@link Transport} implementation that never touches Dapr or the network:
 * `emit`/`send` drive a {@link MessageDispatcher} directly, in-process. Suitable
 * for wiring into `createMicroservicesModule({ transport })` in tests, or for
 * driving handlers directly through {@link MicroserviceHarness}.
 */
export class InMemoryTransport implements Transport {
  constructor(private readonly dispatcher: MessageDispatcher) {}

  async connect(): Promise<void> {
    /* no external sidecar to connect to */
  }

  async close(): Promise<void> {
    /* nothing to tear down */
  }

  async emit(pattern: MessagePatternType, data: unknown): Promise<void> {
    await this.dispatcher.dispatch(pattern, data);
  }

  async send<TResult = unknown>(pattern: MessagePatternType, data: unknown): Promise<TResult> {
    return this.dispatcher.dispatch(pattern, data) as Promise<TResult>;
  }
}

/**
 * Thin ergonomic wrapper over an {@link InMemoryTransport}: fire-and-forget
 * events with `emit`, request/response with `send`.
 */
export class MicroserviceHarness {
  constructor(private readonly transport: InMemoryTransport) {}

  /** Dispatch an event pattern; the handler's return value is discarded. */
  emit(pattern: MessagePatternType, data: unknown): Promise<void> {
    return this.transport.emit(pattern, data);
  }

  /** Dispatch a message pattern and return the handler's result. */
  send<TResult = unknown>(pattern: MessagePatternType, data: unknown): Promise<TResult> {
    return this.transport.send<TResult>(pattern, data);
  }

  /** The underlying transport, e.g. to pass into `createMicroservicesModule`. */
  getTransport(): InMemoryTransport {
    return this.transport;
  }
}
