import type Redis from 'ioredis';
import { BoundedAsyncQueue, type PubSub, type PubSubLogger } from './pubsub';

export interface RedisPubSubOptions {
  /** Optional prefix applied to every channel name. */
  prefix?: string;
  /** Max buffered messages per subscriber before drop-oldest kicks in. Default 1000. */
  maxQueueSize?: number;
  logger?: PubSubLogger;
}

/**
 * Redis-backed pub/sub for horizontally-scaled subscriptions. Requires two
 * ioredis connections — one for publishing and a **dedicated** one for
 * subscribing (a connection in subscriber mode cannot issue normal commands).
 *
 * Payloads are JSON-serialized, so they must be JSON-safe.
 *
 * ```ts
 * const pubsub = new RedisPubSub(new Redis(url), new Redis(url));
 * ```
 */
export class RedisPubSub implements PubSub {
  private readonly prefix: string;
  private readonly maxQueueSize: number;
  private readonly logger?: PubSubLogger;
  /** channel -> active queues */
  private readonly channels = new Map<string, Set<BoundedAsyncQueue<unknown>>>();
  private wired = false;

  constructor(
    private readonly publisher: Redis,
    private readonly subscriber: Redis,
    options: RedisPubSubOptions = {},
  ) {
    this.prefix = options.prefix ?? '';
    this.maxQueueSize = options.maxQueueSize ?? 1000;
    this.logger = options.logger;
  }

  private channelName(topic: string): string {
    return `${this.prefix}${topic}`;
  }

  private ensureWired(): void {
    if (this.wired) {
      return;
    }
    this.wired = true;
    this.subscriber.on('message', (channel: string, message: string) => {
      const queues = this.channels.get(channel);
      if (!queues) {
        return;
      }
      let payload: unknown;
      try {
        payload = JSON.parse(message);
      } catch {
        this.logger?.warn(`[pubsub] failed to parse Redis message on channel "${channel}"`);
        return;
      }
      for (const queue of queues) {
        queue.push(payload);
      }
    });
  }

  async publish<T = unknown>(topic: string, payload: T): Promise<void> {
    await this.publisher.publish(this.channelName(topic), JSON.stringify(payload));
  }

  subscribe<T = unknown>(topic: string): AsyncIterableIterator<T> {
    this.ensureWired();
    const channel = this.channelName(topic);

    const queue = new BoundedAsyncQueue<T>(this.maxQueueSize, () => {
      this.logger?.warn(`[pubsub] dropped oldest message on slow subscriber for topic "${topic}"`);
    });

    let set = this.channels.get(channel);
    if (!set) {
      set = new Set();
      this.channels.set(channel, set);
      void this.subscriber.subscribe(channel);
    }
    set.add(queue as BoundedAsyncQueue<unknown>);

    queue.setOnReturn(() => {
      set!.delete(queue as BoundedAsyncQueue<unknown>);
      if (set!.size === 0) {
        this.channels.delete(channel);
        void this.subscriber.unsubscribe(channel);
      }
    });

    return queue;
  }

  async close(): Promise<void> {
    this.channels.clear();
    await Promise.allSettled([this.subscriber.quit(), this.publisher.quit()]);
  }
}
