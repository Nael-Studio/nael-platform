import type { Logger } from '@nl-framework/logger';
import type {
  MessagePattern,
  MicroserviceSendOptions,
  Transport,
} from '../interfaces/transport';
import { MicroserviceInvocationException } from '../exceptions/microservice-invocation.exception';
import { patternToInvocationPath } from '../routing';

export interface DaprHealthCheckOptions {
  /** How many times to poll the sidecar before giving up. Defaults to 30. */
  retries?: number;
  /** Delay between polls, in milliseconds. Defaults to 1000. */
  intervalMs?: number;
}

export interface DaprTransportOptions {
  daprHost?: string;
  daprHttpPort?: number;
  /** Pub/sub component name. Defaults to `pubsub`. */
  pubsubName?: string;
  /** Default target app id for `send()` (overridable per call). */
  appId?: string;
  /** Default invocation timeout in ms. Defaults to 30000. */
  timeout?: number;
  /** Sidecar health-check polling behavior for `connect()`. */
  healthCheck?: DaprHealthCheckOptions;
  logger?: Logger;
}

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_HEALTH_RETRIES = 30;
const DEFAULT_HEALTH_INTERVAL_MS = 1000;

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

export class DaprTransport implements Transport {
  private readonly daprHost: string;
  private readonly daprHttpPort: number;
  private readonly pubsubName: string;
  private readonly appId?: string;
  private readonly timeout: number;
  private readonly healthRetries: number;
  private readonly healthIntervalMs: number;
  private readonly logger?: Logger;
  private connected = false;

  constructor(options: DaprTransportOptions = {}) {
    this.daprHost = options.daprHost ?? 'localhost';
    this.daprHttpPort = options.daprHttpPort ?? 3500;
    this.pubsubName = options.pubsubName ?? 'pubsub';
    this.appId = options.appId;
    this.timeout = options.timeout ?? DEFAULT_TIMEOUT_MS;
    this.healthRetries = options.healthCheck?.retries ?? DEFAULT_HEALTH_RETRIES;
    this.healthIntervalMs = options.healthCheck?.intervalMs ?? DEFAULT_HEALTH_INTERVAL_MS;
    this.logger = options.logger;
  }

  get pubsub(): string {
    return this.pubsubName;
  }

  async connect(): Promise<void> {
    if (this.connected) {
      return;
    }

    const healthUrl = `${this.baseUrl()}/v1.0/healthz`;
    this.logger?.info('Connecting to Dapr sidecar', {
      host: this.daprHost,
      port: this.daprHttpPort,
      pubsub: this.pubsubName,
    });

    for (let attempt = 1; attempt <= this.healthRetries; attempt += 1) {
      if (await this.probeHealth(healthUrl)) {
        this.connected = true;
        this.logger?.info('Connected to Dapr sidecar', { attempts: attempt });
        return;
      }

      this.logger?.debug('Waiting for Dapr sidecar', {
        attempt,
        retries: this.healthRetries,
      });

      if (attempt < this.healthRetries) {
        await delay(this.healthIntervalMs);
      }
    }

    throw new Error(
      `Could not reach the Dapr sidecar at ${healthUrl} after ${this.healthRetries} attempt(s). ` +
        `Is the sidecar running? Start this service with the Dapr CLI, e.g. ` +
        `\`dapr run --app-id <id> --app-port <port> --dapr-http-port ${this.daprHttpPort} -- bun run src/main.ts\`.`,
    );
  }

  private async probeHealth(url: string): Promise<boolean> {
    try {
      const response = await fetch(url, { method: 'GET' });
      // Dapr healthz returns 204 when the sidecar is ready.
      return response.ok || response.status === 204;
    } catch {
      return false;
    }
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
    const url = `${this.baseUrl()}/v1.0/publish/${this.pubsubName}/${topic}`;

    this.logger?.debug('Publishing event', { topic, pattern });

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to publish event: ${response.status} ${error}`);
    }
  }

  async send<TResult = unknown>(
    pattern: MessagePattern,
    data: unknown,
    options?: MicroserviceSendOptions,
  ): Promise<TResult> {
    this.ensureConnected();

    const appId = options?.appId ?? this.appId;
    if (!appId) {
      throw new Error(
        'Dapr service invocation requires a target app id. Pass `appId` to `send()` ' +
          'or configure `appId` on the DaprTransport.',
      );
    }

    const methodPath = patternToInvocationPath(pattern);
    const url = `${this.baseUrl()}/v1.0/invoke/${appId}/method/${methodPath}`;
    const timeout = options?.timeout ?? this.timeout;

    const controller = new AbortController();
    const onExternalAbort = () => controller.abort();
    if (options?.signal) {
      if (options.signal.aborted) {
        controller.abort();
      } else {
        options.signal.addEventListener('abort', onExternalAbort, { once: true });
      }
    }
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeout);

    this.logger?.debug('Invoking Dapr service', { pattern, url, timeout });

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: data !== undefined ? JSON.stringify(data) : undefined,
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new MicroserviceInvocationException(response.status, errorText, pattern);
      }

      const contentType = response.headers.get('content-type') ?? '';
      if (contentType.includes('application/json')) {
        return (await response.json()) as TResult;
      }
      return (await response.text()) as unknown as TResult;
    } catch (error) {
      if (timedOut) {
        throw new Error(
          `Microservice invocation to '${appId}' (${methodPath}) timed out after ${timeout}ms.`,
        );
      }
      throw error;
    } finally {
      clearTimeout(timer);
      options?.signal?.removeEventListener('abort', onExternalAbort);
    }
  }

  private ensureConnected(): void {
    if (!this.connected) {
      throw new Error('Transport not connected. Call connect() first.');
    }
  }

  private baseUrl(): string {
    return `http://${this.daprHost}:${this.daprHttpPort}`;
  }

  private patternToTopic(pattern: MessagePattern): string {
    if (typeof pattern === 'string') {
      return pattern;
    }
    return Object.entries(pattern)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}.${String(value)}`)
      .join('.');
  }
}
