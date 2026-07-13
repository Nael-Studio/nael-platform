# 04 — Complete the microservices layer

**Goal:** guards/interceptors/pipes actually execute for message handlers;
request/response `send()` works over Dapr service invocation; the transport
health-checks its sidecar; pub/sub subscriptions register automatically.

## Context — read first
- `packages/microservices/src/dispatcher/message-dispatcher.ts` — currently runs
  **only exception filters** around handlers
- `packages/microservices/src/filters/` — the existing execution-context/registry
  pattern to extend
- `packages/http/src/guards/` (execution-context.ts, utils.ts, metadata.ts,
  types.ts) and `packages/http/src/interceptors/` — **the pattern to mirror**
- `packages/microservices/src/transport/dapr-transport.ts` (raw-fetch Dapr client;
  TODO at line ~49), `src/client/microservice-client.ts`,
  `src/interfaces/transport.ts`
- `packages/microservices/src/decorators/patterns.ts` — metadata already captured
- Docs promising this: `docs-site/src/app/docs/microservices/guards/page.mdx`

## Task 1 — Execute guards, interceptors, pipes in the dispatcher

1. Add `packages/microservices/src/guards/execution-context.ts`:
   `MicroserviceExecutionContext` exposing `getPattern()`, `getPayload()`,
   `getMetadata()` (Dapr envelope), `getHandler()`, `getClass()`, plus the same
   shape/interface HTTP's execution context implements so shared guards
   (e.g. `AuthGuard`) can branch on context type. Follow HTTP's file split.
2. Dispatcher pipeline order (match HTTP semantics exactly):
   **guards → interceptors (pre) → pipes (per-payload) → handler → interceptors
   (post) → filters on any throw.**
   - Guard deny → throw the framework's forbidden exception → filters handle it;
     for pub/sub events, a deny must **not** retry the message: return the
     transport's "drop/success" status (for Dapr pub/sub HTTP contract:
     `{"status": "DROP"}`).
   - Pipes transform/validate the deserialized payload before the handler.
3. Global registries: `registerMicroserviceGuard(...)` etc., mirroring
   `registerHttpGuard` naming and the filters registry already present.
4. Tests (`packages/microservices/tests/dispatcher-pipeline.test.ts`): allow path,
   deny path (no handler call, DROP status), pipe transform, pipe reject, filter
   catches handler throw, execution order assertion (record call sequence).

## Task 2 — Request/response: `client.send()`

1. `MicroserviceClient.send<TResult>(pattern, payload, options?): Promise<TResult>`
   via Dapr **service invocation**: `POST
   http://localhost:{daprPort}/v1.0/invoke/{appId}/method/{patternPath}`.
   Pattern→path encoding must be deterministic and documented (e.g. slugify dots:
   `orders.get` → `_nl/msg/orders.get`); the receiving side registers matching
   HTTP-invocation routes for every `@MessagePattern` (not `@EventPattern`).
2. `send()` options: `timeout` (default 30s, abort via `AbortSignal`), `appId`
   override. Non-2xx → typed `MicroserviceInvocationException` carrying status +
   body.
3. Handler return values become the JSON response body; pipeline from Task 1 runs.
4. Tests: in-memory/`fetch`-stubbed round trip, timeout, error mapping, and one
   test asserting `@EventPattern` handlers are NOT exposed for invocation.

## Task 3 — Sidecar health check
Implement `connect()` to poll `GET /v1.0/healthz` on the sidecar with configurable
retries/backoff (`{ retries: 30, intervalMs: 1000 }` defaults, overridable via
transport options). Fail with an actionable error message (include the URL and a
hint that `dapr run` may be missing). Log progress via the injected logger. Tests
with stubbed `fetch`.

## Task 4 — Automatic Dapr pub/sub subscription registration
Serve `GET /dapr/subscribe` returning one entry per `@EventPattern` handler:
`[{ pubsubname, topic, route }]` where `pubsubname` comes from transport options
(default `pubsub`) and `route` is the deterministic pattern path from Task 2.
Remove any manual subscription steps from `examples/microservices` and update that
example. Tests: the JSON document matches registered handlers.

## Acceptance criteria
- Pipeline parity documented in the docs-site guards page (delete the "not yet
  executed" caveat — that's the definition of done).
- `examples/microservices` works end-to-end with `send()` + auto-subscribe
  (document the `dapr run` command in its README).
- All new behavior unit-tested without a live sidecar (stub `fetch`).
