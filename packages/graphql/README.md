# @nl-framework/graphql

Code-first GraphQL layer for the Nael Framework with resolver decorators, schema generation, and Apollo Federation support.

## Installation

```bash
bun add @nl-framework/graphql graphql
```

## Highlights

- **Resolver decorators** – annotate queries, mutations, subscriptions, and field resolvers with expressive decorators.
- **Schema tooling** – generate SDL from TypeScript metadata or stitch existing schemas with federation directives.
- **Input sanitization** – arguments decorated with class-validator rules are transformed via `class-transformer` before resolvers execute, rejecting invalid payloads with `BAD_USER_INPUT` errors.
- **Module integration** – register resolvers alongside providers using standard Nael modules.

## Quick start

```ts
import { Module } from '@nl-framework/core';
import { Resolver, Query, Mutation, Args, InputType, Field } from '@nl-framework/graphql';
import { NaelFactory } from '@nl-framework/platform';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

@InputType()
class CreateUserInput {
  @Field()
  @IsEmail()
  email!: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;
}

@Resolver('User')
class UsersResolver {
  private readonly users = new Map<string, { id: string; email: string; name?: string }>();

  @Query(() => [String])
  users() {
    return Array.from(this.users.values());
  }

  @Mutation(() => String)
  createUser(@Args('input', () => CreateUserInput) input: CreateUserInput) {
    const id = crypto.randomUUID();
    this.users.set(id, { id, email: input.email, name: input.name });
    return id;
  }
}

@Module({
  providers: [UsersResolver],
  resolvers: [UsersResolver],
})
class GraphqlModule {}

const app = await NaelFactory.create(GraphqlModule);
const { graphql } = await app.listen({ http: 4000 });
console.log('GraphQL ready at', graphql?.url ?? 'http://localhost:4000/graphql');
```

## Subscriptions

Declare `@Subscription()` resolvers backed by a pub/sub, served over the
`graphql-transport-ws` protocol on Bun's native WebSockets.

```ts
import { Resolver, Query, Mutation, Subscription, Arg, InMemoryPubSub, createGraphqlApplication } from '@nl-framework/graphql';

const pubsub = new InMemoryPubSub();

@Resolver(() => Order)
class OrderResolver {
  @Mutation(() => Order)
  async createOrder(@Arg('tenantId') tenantId: string): Promise<Order> {
    const order = /* ... */;
    await pubsub.publish('order.created', { tenantId, order });
    return order;
  }

  @Subscription(() => Order, {
    topic: 'order.created',                                   // or `topics: (args, ctx) => string`
    filter: (payload, args, ctx) => payload.tenantId === args.tenantId,
    resolve: (payload) => payload.order,                      // map the payload (identity by default)
  })
  orderCreated(@Arg('tenantId') tenantId: string) {}
}

const app = await createGraphqlApplication(AppModule, {
  pubsub,                     // or register a provider under GRAPHQL_PUBSUB; defaults to in-memory
  subscriptions: true,        // enable the graphql-ws WebSocket transport
  // subscriptions: { path: '/graphql', onConnect: (ctx) => authenticate(ctx.request) },
});
await app.listen(4000);       // HTTP GraphQL + ws://.../graphql on the same port
```

- **PubSub**: `InMemoryPubSub` (default, bounded per-subscriber queues with
  drop-oldest) or `RedisPubSub` (two ioredis connections, JSON payloads) for
  horizontal scale. Both implement the `PubSub` interface.
- **Guards** run in the subscription's `subscribe` phase — a denied guard closes
  the operation with a GraphQL error, using the same registry as queries/mutations.
- **`onConnect`** runs on `connection_init` (do Better Auth session lookup here);
  return `false` to reject or an object merged into the connection context.
- **Federation**: subscriptions do **not** federate through the gateway (an Apollo
  limitation) — the gateway rejects subscription operations with a clear
  `SUBSCRIPTIONS_NOT_FEDERATED` error. Connect clients directly to the owning
  subgraph's WebSocket endpoint.

See `examples/graphql-subscriptions` for a runnable chat feed with an end-to-end
WebSocket test.

## License

Apache-2.0
