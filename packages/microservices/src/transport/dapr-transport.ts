import type { Logger } from '@nl-framework/logger';
import type { MessagePattern, Transport, MessageContext } from '../interfaces/transport';

export interface DaprTransportOptions {
  daprHost?: string;
  daprHttpPort?: number;
  pubsubName?: string;
  logger?: Logger;
}

export class DaprTransport implements Transport {
  private readonly daprHost: string;
  private readonly daprHttpPort: number;
  private readonly pubsubName: string;
  private readonly logger?: Logger;
  private connected = false;

  constructor(options: DaprTransportOptions = {}) {
    this.daprHost = options.daprHost ?? 'localhost';
    this.daprHttpPort = options.daprHttpPort ?? 3500;
    this.pubsubName = options.pubsubName ?? 'redis-pubsub';
    this.logger = options.logger;
  }

  async connect(): Promise<void> {
    if (this.connected) {
      return;
    }

    this.logger?.info('Connecting to Dapr sidecar', {
      host: this.daprHost,
      port: this.daprHttpPort,
      pubsub: this.pubsubName,
    });

    // TODO: Add health check to Dapr sidecar
    this.connected = true;
    this.logger?.info('Connected to Dapr sidecar');
  }

  async close(): Promise<void> {
    if (!this.connected) {
      return;
    }

    this.logger?.info('Closing Dapr transport');
    this.connected = false;
  }

  async emit(pattern: MessagePattern, data: unknown): Promise<void> {
    this.ensureConnected();

    const topic = this.patternToTopic(pattern);
    const url = `http://${this.daprHost}:${this.daprHttpPort}/v1.0/publish/${this.pubsubName}/${topic}`;

    this.logger?.debug('Publishing event', { topic, pattern });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to publish event: ${response.status} ${error}`);
    }
  }

  async send<TResult = unknown>(pattern: MessagePattern, data: unknown): Promise<TResult> {
    this.ensureConnected();

    // TODO: Implement request/response via Dapr service invocation
    throw new Error('send() not yet implemented - use emit() for fire-and-forget events');
  }

  private ensureConnected(): void {
    if (!this.connected) {
      throw new Error('Transport not connected. Call connect() first.');
    }
  }

  private patternToTopic(pattern: MessagePattern): string {
    if (typeof pattern === 'string') {
      return pattern;
    }

    // For object patterns, create a deterministic topic name
    return Object.entries(pattern)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}.${value}`)
      .join('.');
  }
}
