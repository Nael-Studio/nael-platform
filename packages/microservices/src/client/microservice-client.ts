import type {
  MessagePattern,
  MicroserviceSendOptions,
  Transport,
} from '../interfaces/transport';

export class MicroserviceClient {
  constructor(private readonly transport: Transport) {}

  async connect(): Promise<void> {
    await this.transport.connect();
  }

  async close(): Promise<void> {
    await this.transport.close();
  }

  async emit(pattern: MessagePattern, data: unknown): Promise<void> {
    await this.transport.emit(pattern, data);
  }

  /** Fire-and-await a request/response invocation and return the typed result. */
  async send<TResult = unknown>(
    pattern: MessagePattern,
    data: unknown,
    options?: MicroserviceSendOptions,
  ): Promise<TResult> {
    return this.transport.send<TResult>(pattern, data, options);
  }
}
