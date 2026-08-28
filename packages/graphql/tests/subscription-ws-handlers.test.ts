import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { createClient } from 'graphql-ws';
import type { Server } from 'bun';
import { Module } from '@nl-framework/core';
import { GraphqlMetadataStorage } from '../src/internal/metadata';
import { ObjectType } from '../src/decorators/object-type';
import { Field } from '../src/decorators/field';
import { Resolver, Query, Arg } from '../src/decorators/resolver';
import { Subscription } from '../src/decorators/subscription';
import { InMemoryPubSub } from '../src/subscriptions/pubsub';
import { createGraphqlApplication, type GraphqlApplication } from '../src/application';

/**
 * `createSubscriptionWsHandlers()` is the platform-integration path: the caller
 * owns the HTTP server (the framework mounts GraphQL as an HTTP route, not via
 * the standalone `listen()`), so it upgrades subscription sockets on its own Bun
 * server using these handlers. These tests exercise it exactly the way the
 * consuming app does — build handlers, stand up a Bun server, drive a real
 * `graphql-ws` client through it.
 */

const pubsub = new InMemoryPubSub();

const buildModule = () => {
  @ObjectType()
  class Message {
    @Field()
    id!: string;
    @Field()
    room!: string;
  }

  @Resolver(() => Message)
  class ChatResolver {
    @Query(() => Message)
    latest(): Message {
      return { id: '0', room: 'general' };
    }

    @Subscription(() => Message, {
      topics: (args: { room: string }) => `chat.${args.room}`,
    })
    messageSent(@Arg('room') _room: string) {}
  }

  @Module({ resolvers: [ChatResolver] })
  class ChatModule {}

  return ChatModule;
};

describe('createSubscriptionWsHandlers (platform integration)', () => {
  let app: GraphqlApplication | undefined;

  beforeEach(() => {
    GraphqlMetadataStorage.get().clear();
  });

  afterEach(async () => {
    await app?.close();
    app = undefined;
  });

  it('returns undefined when subscriptions are not enabled', async () => {
    app = await createGraphqlApplication(buildModule(), { path: '/graphql' });
    expect(await app.createSubscriptionWsHandlers()).toBeUndefined();
  });

  it('upgrades and delivers over a caller-owned Bun server, honouring an onConnect override', async () => {
    app = await createGraphqlApplication(buildModule(), {
      path: '/graphql',
      pubsub,
      subscriptions: true,
    });

    let sawConnect = false;
    const handlers = await app.createSubscriptionWsHandlers({
      onConnect: () => {
        sawConnect = true;
        return { viewer: 'tester' };
      },
    });
    expect(handlers).toBeDefined();
    expect(handlers!.path).toBe('/graphql');

    // Wire the handlers onto a Bun server the same way the consuming app does.
    const server: Server = Bun.serve({
      port: 0,
      fetch(request, srv) {
        if ((request.headers.get('upgrade') ?? '').toLowerCase() === 'websocket') {
          const upgraded = srv.upgrade(request, {
            data: handlers!.upgradeData(request),
          });
          return upgraded ? undefined : new Response('upgrade failed', { status: 400 });
        }
        return new Response('not found', { status: 404 });
      },
      websocket: handlers!.websocket,
    });

    try {
      const client = createClient({
        url: `ws://localhost:${server.port}/graphql`,
        lazy: false,
        retryAttempts: 0,
      });

      const received: Array<{ id: string; room: string }> = [];
      const done = new Promise<void>((resolve, reject) => {
        client.subscribe(
          {
            query: `subscription($room: String!) { messageSent(room: $room) { id room } }`,
            variables: { room: 'general' },
          },
          {
            next: (data: any) => {
              received.push(data.data.messageSent);
              resolve();
            },
            error: (err) => reject(err instanceof Error ? err : new Error(String(err))),
            complete: () => {},
          },
        );
      });

      await new Promise((r) => setTimeout(r, 200));
      await pubsub.publish('chat.general', { id: '1', room: 'general' });

      await done;
      expect(received[0]).toEqual({ id: '1', room: 'general' });
      expect(sawConnect).toBe(true);
      await client.dispose();
    } finally {
      server.stop(true);
    }
  });
});
