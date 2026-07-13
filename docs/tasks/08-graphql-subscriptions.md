# 08 — GraphQL subscriptions + WebSocket support

**Goal:** `@Subscription()` decorator with a pub/sub abstraction, served over the
`graphql-ws` protocol on Bun's native WebSocket support.

## Context — read first
- `packages/graphql/src/graphql-application.ts` — how Apollo + the HTTP listener
  are wired (determine whether it uses `Bun.serve` directly or the http package)
- `packages/graphql/src/internal/metadata.ts` + `type-helpers.ts` — how
  Query/Mutation resolvers are collected into the schema (Subscription follows
  the same path with a `subscribe` function)
- `packages/graphql/src/decorators/` — decorator conventions
- Bun WebSocket API: `Bun.serve({ websocket: {...} })` upgrade model
- `graphql-ws` protocol spec (the package `graphql-ws` is the one allowed new
  dependency; its server core is transport-agnostic — implement the Bun socket
  adapter by hand, ~100 lines)

## Task 1 — PubSub abstraction
`packages/graphql/src/subscriptions/pubsub.ts`:

```ts
interface PubSub {
  publish<T>(topic: string, payload: T): Promise<void>;
  subscribe<T>(topic: string): AsyncIterableIterator<T>;
}
```
- `InMemoryPubSub` (default): fan-out to local async iterators; must handle
  slow consumers with a bounded per-subscriber queue (drop-oldest + warn log).
- `RedisPubSub`: reuse ioredis (already a core dep) with a dedicated
  subscriber connection; JSON serialization; document that payloads must be
  serializable.
- DI token `GRAPHQL_PUBSUB`, default provider `InMemoryPubSub`, overridable via
  `GraphqlApplication` options.

## Task 2 — `@Subscription()` decorator + schema wiring

```ts
@Resolver(() => Order)
class OrderResolver {
  @Subscription(() => Order, {
    topic: 'order.created',                       // or topics: [...]
    filter: (payload, args, ctx) => payload.tenantId === ctx.tenantId,  // optional
    resolve: (payload) => payload.order,          // optional mapper
  })
  orderCreated(@Arg('tenantId') tenantId: string) {}
}
```
- Schema builder emits a `Subscription` root type; the field's `subscribe` fn:
  guard execution (same registry as queries/mutations — a failing guard closes
  with a GraphQL error, not a socket error) → `pubsub.subscribe(topic)` →
  wrap with filter → map with resolve.
- Async-iterator topic can also be dynamic: `topic: (args, ctx) => string`.

## Task 3 — graphql-ws transport on Bun
- Upgrade path `/graphql` (same path, `connection: Upgrade` detection) or
  configurable `subscriptionsPath`.
- Implement `graphql-ws` server hooks over Bun's websocket handlers:
  `connection_init` (run an optional user `onConnect(ctx)` for auth — surface
  Better Auth session lookup in docs), `subscribe`, `complete`, keep-alive ping.
- Connection context flows into resolver ctx like HTTP context does.
- Graceful shutdown: close all sockets with `1001` on app stop.

## Task 4 — Federation note + example
Subscriptions don't federate through the gateway (Apollo limitation) — the
gateway application must reject subscription operations with a clear error.
Add `examples/graphql-subscriptions` (chat or order-feed) with a bun test
driving a real ws client (`graphql-ws` client in test) against an ephemeral port.

## Acceptance criteria
- Query/mutation behavior untouched; subscriptions fully opt-in.
- Guard deny, filter, dynamic topic, Redis round-trip (mocked ioredis), slow
  consumer bound, and end-to-end ws test all covered.
- Docs-site graphql section gains a subscriptions page.
