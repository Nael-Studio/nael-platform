/**
 * Transport-agnostic publish/subscribe contract backing GraphQL subscriptions.
 * Payloads flow from `publish(topic, payload)` to every active
 * `subscribe(topic)` async iterator.
 */
export interface PubSub {
  publish<T = unknown>(topic: string, payload: T): Promise<void>;
  subscribe<T = unknown>(topic: string): AsyncIterableIterator<T>;
  /** Optional teardown (e.g. closing Redis connections). */
  close?(): Promise<void>;
}

/** Minimal logger surface so the pub/sub does not hard-depend on the logger package. */
export interface PubSubLogger {
  warn(message: string, ...meta: unknown[]): void;
}

/**
 * A bounded async-iterator queue. Producers `push`; consumers `for await`. When
 * the queue exceeds `maxSize`, the oldest value is dropped (and a warning is
 * emitted) so a slow consumer cannot grow memory without bound.
 */
export class BoundedAsyncQueue<T> implements AsyncIterableIterator<T> {
  private readonly values: T[] = [];
  private readonly pending: Array<(result: IteratorResult<T>) => void> = [];
  private done = false;
  private onReturn?: () => void;

  constructor(
    private readonly maxSize: number,
    private readonly onDrop?: () => void,
  ) {}

  push(value: T): void {
    if (this.done) {
      return;
    }
    const waiter = this.pending.shift();
    if (waiter) {
      waiter({ value, done: false });
      return;
    }
    this.values.push(value);
    if (this.values.length > this.maxSize) {
      this.values.shift();
      this.onDrop?.();
    }
  }

  /** Register a callback to run when the consumer stops iterating. */
  setOnReturn(fn: () => void): void {
    this.onReturn = fn;
  }

  finish(): void {
    this.done = true;
    while (this.pending.length) {
      this.pending.shift()!({ value: undefined as unknown as T, done: true });
    }
  }

  next(): Promise<IteratorResult<T>> {
    if (this.values.length) {
      return Promise.resolve({ value: this.values.shift()!, done: false });
    }
    if (this.done) {
      return Promise.resolve({ value: undefined as unknown as T, done: true });
    }
    return new Promise((resolve) => {
      this.pending.push(resolve);
    });
  }

  return(): Promise<IteratorResult<T>> {
    this.finish();
    this.onReturn?.();
    return Promise.resolve({ value: undefined as unknown as T, done: true });
  }

  throw(error?: unknown): Promise<IteratorResult<T>> {
    this.finish();
    this.onReturn?.();
    return Promise.reject(error);
  }

  [Symbol.asyncIterator](): AsyncIterableIterator<T> {
    return this;
  }
}

export interface InMemoryPubSubOptions {
  /** Max buffered messages per subscriber before drop-oldest kicks in. Default 1000. */
  maxQueueSize?: number;
  logger?: PubSubLogger;
}

/**
 * Default in-process pub/sub. Fans a published payload out to every local
 * subscriber's bounded queue.
 */
export class InMemoryPubSub implements PubSub {
  private readonly topics = new Map<string, Set<BoundedAsyncQueue<unknown>>>();
  private readonly maxQueueSize: number;
  private readonly logger?: PubSubLogger;

  constructor(options: InMemoryPubSubOptions = {}) {
    this.maxQueueSize = options.maxQueueSize ?? 1000;
    this.logger = options.logger;
  }

  async publish<T = unknown>(topic: string, payload: T): Promise<void> {
    const subscribers = this.topics.get(topic);
    if (!subscribers) {
      return;
    }
    for (const queue of subscribers) {
      queue.push(payload);
    }
  }

  subscribe<T = unknown>(topic: string): AsyncIterableIterator<T> {
    const queue = new BoundedAsyncQueue<T>(this.maxQueueSize, () => {
      this.logger?.warn(`[pubsub] dropped oldest message on slow subscriber for topic "${topic}"`);
    });

    let set = this.topics.get(topic) as Set<BoundedAsyncQueue<unknown>> | undefined;
    if (!set) {
      set = new Set();
      this.topics.set(topic, set);
    }
    set.add(queue as BoundedAsyncQueue<unknown>);

    queue.setOnReturn(() => {
      set!.delete(queue as BoundedAsyncQueue<unknown>);
      if (set!.size === 0) {
        this.topics.delete(topic);
      }
    });

    return queue;
  }
}
