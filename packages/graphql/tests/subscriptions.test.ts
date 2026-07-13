import { describe, it, expect, beforeEach } from 'bun:test';
import { GraphqlSchemaBuilder } from '../src/schema-builder';
import { GraphqlMetadataStorage } from '../src/internal/metadata';
import { ObjectType } from '../src/decorators/object-type';
import { Field } from '../src/decorators/field';
import { Resolver, Query, Arg, Context } from '../src/decorators/resolver';
import { Subscription } from '../src/decorators/subscription';
import { InMemoryPubSub } from '../src/subscriptions/pubsub';
import { registerGraphqlGuard, clearGraphqlGuards } from '../src/guards/registry';
import type { GraphqlExecutionContext } from '../src/guards/types';

const collect = async <T>(iter: AsyncIterableIterator<T>, count: number): Promise<T[]> => {
  const out: T[] = [];
  for (let i = 0; i < count; i += 1) {
    const { value } = await iter.next();
    out.push(value);
  }
  return out;
};

@ObjectType()
class Order {
  @Field()
  id!: string;
  @Field()
  tenantId!: string;
}

beforeEach(() => {
  GraphqlMetadataStorage.get().clear();
  clearGraphqlGuards();
});

describe('GraphQL subscriptions schema wiring', () => {
  it('emits a Subscription root type in the SDL', () => {
    @Resolver(() => Order)
    class OrderResolver {
      @Query(() => Order)
      order() {
        return { id: '1', tenantId: 't1' };
      }
      @Subscription(() => Order, { topic: 'order.created' })
      orderCreated() {}
    }

    const artifacts = new GraphqlSchemaBuilder().build([new OrderResolver()]);
    expect(artifacts.typeDefs).toContain('type Subscription {');
    expect(artifacts.typeDefs).toContain('orderCreated: Order');
    expect(typeof artifacts.resolvers.Subscription.orderCreated.subscribe).toBe('function');
  });

  it('streams published payloads through subscribe + resolve', async () => {
    @Resolver(() => Order)
    class OrderResolver {
      @Subscription(() => Order, {
        topic: 'order.created',
        resolve: (payload: { order: Order }) => payload.order,
      })
      orderCreated() {}
    }

    const pubsub = new InMemoryPubSub();
    const artifacts = new GraphqlSchemaBuilder().build([new OrderResolver()], { pubsub });
    const field = artifacts.resolvers.Subscription.orderCreated;

    const iterator = await field.subscribe({}, {}, {}, {});
    await pubsub.publish('order.created', { order: { id: '9', tenantId: 't1' } });
    const [payload] = await collect(iterator, 1);
    expect(field.resolve(payload, {}, {}, {})).toEqual({ id: '9', tenantId: 't1' });
  });

  it('applies a filter using args + context', async () => {
    @Resolver(() => Order)
    class OrderResolver {
      @Subscription(() => Order, {
        topic: 'order.created',
        filter: (payload: Order, args, ctx: any) => payload.tenantId === ctx.tenantId,
      })
      orderCreated(@Arg('tenantId') _tenantId: string, @Context() _ctx: unknown) {}
    }

    const pubsub = new InMemoryPubSub();
    const artifacts = new GraphqlSchemaBuilder().build([new OrderResolver()], { pubsub });
    const iterator = await artifacts.resolvers.Subscription.orderCreated.subscribe(
      {},
      { tenantId: 't1' },
      { tenantId: 't1' },
      {},
    );

    await pubsub.publish('order.created', { id: 'a', tenantId: 't2' }); // filtered out
    await pubsub.publish('order.created', { id: 'b', tenantId: 't1' }); // passes
    const [first] = await collect(iterator, 1);
    expect(first).toEqual({ id: 'b', tenantId: 't1' } as Order);
  });

  it('supports a dynamic topic derived from args', async () => {
    @Resolver(() => Order)
    class OrderResolver {
      @Subscription(() => Order, {
        topics: (args: { room: string }) => `chat.${args.room}`,
      })
      orderCreated(@Arg('room') _room: string) {}
    }

    const pubsub = new InMemoryPubSub();
    const artifacts = new GraphqlSchemaBuilder().build([new OrderResolver()], { pubsub });
    const iterator = await artifacts.resolvers.Subscription.orderCreated.subscribe(
      {},
      { room: 'general' },
      {},
      {},
    );
    await pubsub.publish('chat.other', { id: 'x', tenantId: 't' });
    await pubsub.publish('chat.general', { id: 'y', tenantId: 't' });
    const [value] = await collect(iterator, 1);
    expect(value).toEqual({ id: 'y', tenantId: 't' } as Order);
  });

  it('closes with a GraphQL error when a guard denies', async () => {
    registerGraphqlGuard((_ctx: GraphqlExecutionContext) => false);

    @Resolver(() => Order)
    class OrderResolver {
      @Subscription(() => Order, { topic: 'order.created' })
      orderCreated() {}
    }

    const pubsub = new InMemoryPubSub();
    const artifacts = new GraphqlSchemaBuilder().build([new OrderResolver()], {
      pubsub,
      guards: { resolve: async () => undefined as never },
    });

    await expect(
      artifacts.resolvers.Subscription.orderCreated.subscribe({}, {}, {}, {}),
    ).rejects.toThrow('Forbidden');
  });

  it('throws a clear error when no pubsub is configured', async () => {
    @Resolver(() => Order)
    class OrderResolver {
      @Subscription(() => Order, { topic: 'order.created' })
      orderCreated() {}
    }
    const artifacts = new GraphqlSchemaBuilder().build([new OrderResolver()]);
    await expect(
      artifacts.resolvers.Subscription.orderCreated.subscribe({}, {}, {}, {}),
    ).rejects.toThrow('No PubSub configured');
  });
});
