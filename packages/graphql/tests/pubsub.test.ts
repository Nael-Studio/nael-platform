import { describe, expect, it } from 'bun:test';
import { InMemoryPubSub } from '../src/subscriptions/pubsub';
import { RedisPubSub } from '../src/subscriptions/redis-pubsub';

const nextValue = async <T>(iter: AsyncIterableIterator<T>): Promise<T> => {
  const { value } = await iter.next();
  return value;
};

describe('InMemoryPubSub', () => {
  it('fans a published payload out to all subscribers', async () => {
    const pubsub = new InMemoryPubSub();
    const a = pubsub.subscribe<{ n: number }>('topic');
    const b = pubsub.subscribe<{ n: number }>('topic');

    await pubsub.publish('topic', { n: 1 });

    expect(await nextValue(a)).toEqual({ n: 1 });
    expect(await nextValue(b)).toEqual({ n: 1 });
  });

  it('isolates topics', async () => {
    const pubsub = new InMemoryPubSub();
    const a = pubsub.subscribe<number>('a');
    await pubsub.publish('b', 99);
    await pubsub.publish('a', 1);
    expect(await nextValue(a)).toBe(1);
  });

  it('drops the oldest message for a slow subscriber and warns', async () => {
    const warnings: string[] = [];
    const pubsub = new InMemoryPubSub({ maxQueueSize: 2, logger: { warn: (m) => warnings.push(m) } });
    const sub = pubsub.subscribe<number>('t');

    for (let i = 1; i <= 5; i += 1) {
      await pubsub.publish('t', i);
    }

    // Only the last 2 survive the bound.
    expect(await nextValue(sub)).toBe(4);
    expect(await nextValue(sub)).toBe(5);
    expect(warnings.length).toBe(3);
  });

  it('removes the subscriber on return()', async () => {
    const pubsub = new InMemoryPubSub();
    const sub = pubsub.subscribe<number>('t');
    await sub.return!();
    // Publishing after return must not throw or leak.
    await pubsub.publish('t', 1);
    expect((await sub.next()).done).toBe(true);
  });
});

/** A minimal ioredis stand-in wiring publish → subscriber 'message' events. */
class FakeRedisBus {
  private handler?: (channel: string, message: string) => void;
  private readonly subscribed = new Set<string>();

  makePublisher(): any {
    return {
      publish: async (channel: string, message: string) => {
        if (this.subscribed.has(channel)) {
          this.handler?.(channel, message);
        }
      },
      quit: async () => undefined,
    };
  }

  makeSubscriber(): any {
    return {
      on: (_event: string, cb: (channel: string, message: string) => void) => {
        this.handler = cb;
      },
      subscribe: async (channel: string) => {
        this.subscribed.add(channel);
      },
      unsubscribe: async (channel: string) => {
        this.subscribed.delete(channel);
      },
      quit: async () => undefined,
    };
  }
}

describe('RedisPubSub', () => {
  it('round-trips a JSON payload through Redis channels', async () => {
    const bus = new FakeRedisBus();
    const pubsub = new RedisPubSub(bus.makePublisher(), bus.makeSubscriber(), { prefix: 'app:' });
    const sub = pubsub.subscribe<{ hello: string }>('greet');
    // Allow the async subscribe() to register the channel.
    await Promise.resolve();
    await pubsub.publish('greet', { hello: 'world' });
    expect(await nextValue(sub)).toEqual({ hello: 'world' });
  });
});
