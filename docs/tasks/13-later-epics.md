# 13 — Later epics (v0.6+): design sketches

Not yet specced to execution depth. Each needs a short design doc (in this
directory) before implementation. Capture here: intent, constraints, and the
open questions an implementer must answer first.

## Temporal (`@nl-framework/temporal`) — roadmap item 15
- **Spike first (blocking):** does `@temporalio/worker` (Rust core, Node native
  modules) run under Bun 1.x? Deliverable: a scratch repo note in the design doc
  with pass/fail per API (worker start, activity heartbeat, workflow bundle).
  If fail → design the Node-sidecar-worker escape hatch (framework app hosts
  client only; worker runs via `node` subprocess).
- API per roadmap: `TemporalModule.forRoot()`, injectable client, `@Activity()`
  / `@ActivityMethod()` DI-resolved activities, module-managed worker lifecycle,
  `nl g workflow|activity`, devtools panel.
- Constraint: workflow code must be bundled deterministically (Temporal's own
  bundler) — the CLI generator must scaffold the required isolation (workflows
  in a separate dir with no framework imports).

## Job queues (`@nl-framework/queues`) — item 18
- Redis-backed (ioredis already present). `@Processor('emails')` class +
  `@Process('send')` methods; producer `queue.add(name, data, { delay, attempts,
  backoff })`; retries with exponential backoff; dead-letter list.
- Decide: hand-rolled Redis streams implementation vs depending on BullMQ.
  Bias: **depend on BullMQ** (battle-tested; check Bun compat) — hand-rolling
  job semantics is a project in itself. Devtools queue panel reuses the
  instrumentation bus.

## Event system (`@nl-framework/events`) — item 19
- `EventEmitterModule.forRoot()`, `emitter.emit('order.created', payload)`,
  `@OnEvent('order.*')` with wildcard matching; sync + async dispatch; handler
  errors go through exception filters, never crash the emitter.
- Design question: relation to ORM `WriteNotifier` (bridge, don't merge) and to
  Dapr pub/sub (same decorator? No — keep `@EventPattern` for transport events,
  `@OnEvent` for in-process; document the boundary).

## OpenTelemetry — item 20
- `@nl-framework/otel`: tracer provider setup from config; auto-spans for HTTP
  route / GraphQL resolver / ORM op / message handler — **emit from the same
  seams the devtools instrumentation bus uses** (12.1 must land first; the bus
  and OTel share hook points, not implementations).
- Context propagation: W3C traceparent in/out (HTTP + Dapr metadata);
  RequestContext carries the active span.

## PostgreSQL driver — item 17
- Precondition: ORM 6h (named connections) merged.
- Step 1 is an interface extraction PR: `packages/orm/src/interfaces/driver.ts`
  currently reflects Mongo; define the neutral driver contract (connect, ping,
  repository factory, index sync, transaction runner) and make `MongoDriver`
  implement it with zero behavior change.
- Step 2: `PostgresDriver` on Bun's native `sql`; repository semantics mapping
  (filters → WHERE builder is the hard part; scope v1 to: equality, `$in`,
  comparison ops, `$and/$or`, sort/limit/skip) + JSONB for un-modeled fields.
  Migrations (6e) get a SQL flavor.

## NATS transport — item 16
- Precondition: spec 04 merged (transport interface hardened by a second real
  consumer: request/reply + pub/sub + queue groups map cleanly to NATS).
- `natsTransport({ servers })` implementing the same transport interface;
  `send()` → NATS request/reply; `@EventPattern` → subscriptions with queue
  group = app name. Dep: `nats` package (check Bun compat — pure JS client).
