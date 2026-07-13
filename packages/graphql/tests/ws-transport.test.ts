import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { createClient } from 'graphql-ws';
import { Module } from '@nl-framework/core';
import { GraphqlMetadataStorage } from '../src/internal/metadata';
import { ObjectType } from '../src/decorators/object-type';
import { Field } from '../src/decorators/field';
import { Resolver, Query, Arg } from '../src/decorators/resolver';
import { Subscription } from '../src/decorators/subscription';
import { InMemoryPubSub } from '../src/subscriptions/pubsub';
import { createGraphqlApplication, type GraphqlApplication } from '../src/application';

const pubsub = new InMemoryPubSub();

const buildModule = () => {
  @ObjectType()
  class Message {
    @Field()
    id!: string;
    @Field()
    text!: string;
    @Field()
    room!: string;
  }

  @Resolver(() => Message)
  class ChatResolver {
    @Query(() => Message)
    latest(): Message {
      return { id: '0', text: 'seed', room: 'general' };
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

describe('GraphQL subscriptions over graphql-ws', () => {
  let app: GraphqlApplication | undefined;
  let port = 0;

  beforeEach(async () => {
    GraphqlMetadataStorage.get().clear();
    app = await createGraphqlApplication(buildModule(), {
      path: '/graphql',
      pubsub,
      subscriptions: true,
    });
    const { url } = await app.listen(0);
    port = Number(new URL(url).port);
  });

  afterEach(async () => {
    await app?.close();
    app = undefined;
  });

  it('delivers published payloads to a graphql-ws client', async () => {
    const client = createClient({
      url: `ws://localhost:${port}/graphql`,
      lazy: false,
      retryAttempts: 0,
    });

    const received: Array<{ id: string; text: string; room: string }> = [];
    const done = new Promise<void>((resolve, reject) => {
      client.subscribe(
        {
          query: `subscription($room: String!) { messageSent(room: $room) { id text room } }`,
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

    // Allow connection_init + subscribe to round-trip before publishing.
    await new Promise((r) => setTimeout(r, 200));
    await pubsub.publish('chat.general', { id: '1', text: 'hello', room: 'general' });

    await done;
    expect(received[0]).toEqual({ id: '1', text: 'hello', room: 'general' });
    await client.dispose();
  });
});
