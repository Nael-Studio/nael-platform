import type { Logger } from '@nl-framework/logger';
import type { MessagePattern, Transport, MessageContext } from '../interfaces/transport';

export interface DaprTransportOptions {
  daprHost?: string;
  daprHttpPort?: number;
  pubsubName?: string;
  logger?: Logger;
  /**
   * Resolve a pattern into a Dapr service invocation target.
   * Defaults:
   * - string pattern "orders:create" or "orders.create" => appId "orders", method "create"
   * - object pattern with { app|service|target, method|action|cmd }
   */
  invocationResolver?: (pattern: MessagePattern, data?: unknown) => {
    appId: string;
    method: string;
    httpVerb?: string;
  };
}

export class DaprTransport implements Transport {
  private readonly daprHost: string;
  private readonly daprHttpPort: number;
  private readonly pubsubName: string;
  private readonly logger?: Logger;
  private readonly invocationResolver: Required<DaprTransportOptions>['invocationResolver'];
  private connected = false;

  constructor(options: DaprTransportOptions = {}) {
    this.daprHost = options.daprHost ?? 'localhost';
    this.daprHttpPort = options.daprHttpPort ?? 3500;
    this.pubsubName = options.pubsubName ?? 'redis-pubsub';
    this.logger = options.logger;
    this.invocationResolver = options.invocationResolver ?? this.defaultInvocationResolver;
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

    const target = this.invocationResolver(pattern, data);
    if (!target?.appId || !target.method) {
      throw new Error('Dapr invocation target is missing appId or method.');
    }

    const methodPath = target.method.replace(/^\/+/, '');
    const url = `http://${this.daprHost}:${this.daprHttpPort}/v1.0/invoke/${target.appId}/method/${methodPath}`;
    const verb = (target.httpVerb ?? 'POST').toUpperCase();

    this.logger?.debug('Invoking Dapr service', { pattern, url, verb });

    const response = await fetch(url, {
      method: verb,
      headers: {
        'Content-Type': 'application/json',
      },
      body: data !== undefined ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to invoke service: ${response.status} ${errorText}`);
    }

    const contentType = response.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
      return (await response.json()) as TResult;
    }

    return (await response.text()) as unknown as TResult;
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

  private defaultInvocationResolver(
    pattern: MessagePattern,
    _data?: unknown,
  ): { appId: string; method: string; httpVerb?: string } {
    if (typeof pattern === 'string') {
      // support "app:method" or "app.method"
      const separator = pattern.includes(':') ? ':' : '.';
      const [appId, ...rest] = pattern.split(separator).filter(Boolean);
      if (!appId || rest.length === 0) {
        throw new Error('String pattern for send() must look like "app:method" or "app.method".');
      }
      return { appId, method: rest.join('/') };
    }

    const candidate = pattern as Record<string, unknown>;
    const appId =
      (candidate.app as string) ||
      (candidate.service as string) ||
      (candidate.target as string) ||
      '';
    const method =
      (candidate.method as string) ||
      (candidate.action as string) ||
      (candidate.cmd as string) ||
      '';

    if (!appId || !method) {
      throw new Error(
        'Object pattern for send() must include app|service|target and method|action|cmd fields.',
      );
    }

    return { appId, method };
  }
}
