import type { MessagePattern, Transport } from '../interfaces/transport';

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

  async send<TResult = unknown>(pattern: MessagePattern, data: unknown): Promise<TResult> {
    return this.transport.send<TResult>(pattern, data);
  }
}
