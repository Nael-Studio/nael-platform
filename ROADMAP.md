# NL Framework Roadmap

_Last updated: 2026-07-12 · framework version 0.3.6_

This roadmap is based on a full scan of the monorepo (all 14 packages, 11 examples,
docs-site, and the "Planned" section of the README). Items are ordered by impact on
framework credibility and developer experience, split into **Now / Next / Later**.

**Field feedback:** items marked _(field: devops-portal-v2)_ are grounded in gaps the
DevOps Portal hit in production on 0.3.6 — each cites the portal workaround it would
delete. Item numbers are stable IDs (referenced by `docs/tasks/`), so field-driven
additions are appended as **23–26** rather than renumbering existing items.

> **Implementation specs:** each numbered item has an agent-executable breakdown in
> [`docs/tasks/`](docs/tasks/README.md) — context files, API sketches, and acceptance
> criteria detailed enough to hand to an implementation agent directly.

---

## ✅ Just completed (this branch)

- **GraphQL stack upgraded** (was ~8 months behind):
  - `graphql` `^16.8.1` → `^16.11.0` (resolved 16.11.0)
  - `@apollo/server` `^5.0.0` → `^5.5.1`
  - `@apollo/subgraph` / `@apollo/gateway` `^2.7.4` → `^2.14.2` (resolved 2.14.2)
  - Applied to `packages/graphql` and `examples/federation-gateway`. Full build passes;
    all 21 graphql tests pass.
  - **Note:** `graphql@17.0.2` shipped in July 2026, but every Apollo package still
    peer-requires `graphql ^16.x`. Track Apollo's v17 support and revisit (see Later).

---

## 🔥 Now (v0.4.0) — close the gaps that block real adoption

### 1. Fix the 4 pre-existing failing tests
`bun test` currently fails 4/145 on a clean tree — a red suite hides real regressions.
- `packages/core/tests/decorators.test.ts` — filter dedup ordering + handler-before-controller filter priority (2 failures)
- `packages/microservices/tests/decorators.test.ts` — guard/interceptor/pipe/filter metadata capture
- `packages/auth/tests/options.test.ts` — legacy adapter → `database` option mapping
Decide per-case whether the implementation or the test expectation is wrong.

### 2. Testing utilities package (`@nl-framework/testing`)
The single biggest DX gap vs NestJS (already listed as planned in README). No
`Test.createTestingModule` equivalent exists anywhere in `packages/*/src`.
- Module builder with provider overrides (`overrideProvider`, `overrideGuard`, …)
- Lightweight HTTP test client against `HttpApplication` (supertest-style, Bun-native)
- GraphQL `executeOperation` helper against `GraphqlApplication`
- In-memory transport for microservices handler testing
- In-memory Mongo driver (or `mongodb-memory-server` integration) for repository tests
This also unblocks item 3 — the framework can't reasonably ask users to test what it
can't test itself. _(field: devops-portal-v2)_ The portal's only API test hand-rolls
an `InMemoryRepo<T>` with find/findOne/save/count
(`apps/api/src/forms/form.service.spec.ts`) — exactly the repository fake this
package should ship.

### 3. Test coverage for load-bearing packages
Current counts: `platform` **0** (yet it composes everything via `NaelFactory`),
`storage` **0**, `cli` **0**, `mcp-server` **0**, `http` **1**, `config` **1**, `logger` **1**.
Minimum bar for v0.4: platform factory smoke tests (HTTP + GraphQL + gateway modes),
http router/pipes/guards matrix, storage adapters against mocked SDK clients.

### 4. Finish the microservices layer (it's the weakest claim on the tin)
The README advertises "Dapr microservices" but the implementation is partial:
- **Execute guards in `MessageDispatcher`** — decorators are captured but never run
  (docs admit this: `docs-site/.../microservices/guards/page.mdx`). Add a microservice
  `ExecutionContext` and run interceptors/pipes too, matching HTTP/GraphQL parity.
- **Request/response pattern** — `client.send()` via Dapr service invocation (README-planned).
- **Dapr sidecar health check** on `connect()` — today it just sets a flag
  (`packages/microservices/src/transport/dapr-transport.ts:49` TODO).
- **Automatic subscription endpoint registration** for Dapr pub/sub (README-planned).

### 5. ORM correctness & ergonomics fixes (quick wins, current package)
Grounded in `packages/orm/src/repository/mongo-repository.ts` as it stands today:
- **Atomic `save()`** — the update path is `updateOne` + `findOne` (two round trips
  with a race window, `mongo-repository.ts:153-179`); switch to `findOneAndUpdate`
  with `returnDocument: 'after'`.
- **Convenience methods** users expect on day one: `exists()`, `findOneOrFail()` /
  `findByIdOrFail()` (throwing the framework's `ApplicationException`), `updateOne()`
  (only `updateMany` exists), `increment()`/`decrement()`, `distinct()`.
- **`aggregate()` passthrough** with soft-delete filter injection — today there is no
  way to run a pipeline through the repository at all.
- **Cursor/streaming reads** — `find()` always materializes `toArray()`; expose an
  async-iterator variant for large collections.
- **Pagination helpers** — `findAndCount()` plus a cursor-based `paginate()` that can
  back GraphQL connection types. _(field: devops-portal-v2)_ Ship the GraphQL side
  too: a generic `Paginated<T>()` ObjectType factory and a `PaginationArgs` input with
  page/size clamping — the portal hand-rolls both
  (`apps/api/src/common/models/paginated-response.model.ts`,
  `apps/api/src/common/dto/pagination.args.ts`).
- **`upsert(filter, doc)` on the repository** _(field: devops-portal-v2)_ — only
  `bulkUpsert` exists, so single keyed idempotent upserts drop to the raw collection
  (`azure-devops-scan.service.ts:129-144`).
- **Loose/extra-field read mode** _(field: devops-portal-v2)_ — fields not declared on
  the model class are stripped from reads, forcing `(repo as any).collection` escapes
  to recover data written by older code (`azure-devops-scan.service.ts` secret-scan
  results). Add an opt-in to preserve unknown fields (relates to 6a).

### 23. Eager providers — retire the `bootstrap: []` workaround _(field: devops-portal-v2)_
Providers are lazy (`core/src/discovery/discovery-service.ts`), so a provider whose
`onModuleInit` performs registration side effects (seeding, workflow-handler
registration, index sync) silently never runs unless it is force-instantiated via a
module `bootstrap: []` array. The portal carries this workaround in four modules:
`app.module.ts:142-143` (`EnsureIndexesBootstrap`, `SyncOutboxBootstrap`),
`rbac/rbac.module.ts:31`, `pipeline-enrollment/pipeline-enrollment.module.ts:33-35`,
`notifications/notifications.module.ts:45`.
- Eagerly instantiate providers that implement `OnModuleInit` /
  `OnApplicationBootstrap` by default (they declared a lifecycle interest — honor it),
  or, if that's too invasive, add an explicit `@Eager()` decorator /
  `{ provide, useClass, eager: true }` option.
- Keep `bootstrap: []` working; document it as the manual override, not the norm.
- Emit a dev-mode warning when a never-instantiated provider implements a lifecycle
  hook — today this failure mode is invisible.

### 24. Field-reported correctness fixes _(field: devops-portal-v2)_
Production bugs on 0.3.6, each currently patched in app code. All are small,
high-trust fixes in the spirit of item 1:
- **a. ORM connection race** — concurrent first calls to `ensureConnection` race;
  the portal monkey-patches `driver.createConnection` and memoizes
  `ensureConnection` into a single in-flight promise
  (`apps/api/src/config/database.config.ts:24-43`). Make connection establishment
  single-flight inside `MongoConnection`.
- **b. Non-fatal index sync** — `autoIndex` is all-or-nothing fail-loud: one unique
  index over a collection with pre-existing duplicates crashes API startup. The
  portal replaces it with a per-index try/catch bootstrap over
  `getRegisteredDocuments()` (`apps/api/src/database/ensure-indexes.bootstrap.ts`).
  Add `autoIndex: 'non-fatal'` (per-index error isolation + a report of failed
  indexes) alongside the current strict mode.
- **c. Validation footgun** — a GraphQL `@InputType` with zero validators is rejected
  by `forbidUnknownValues` with an empty-issues "Validation failed"; every input must
  carry a dummy validator (`azure-devops/dto/create-repository.input.ts:6-8`).
  Register known input types with the pipe (or skip `forbidUnknownValues` for
  registered `@InputType`s) and always surface actionable issue details.
- **d. Middleware skips unmatched routes & OPTIONS** — the router's middleware chain
  only runs after a route match, so CORS preflight (OPTIONS) and 404s bypass it
  entirely. The portal re-wraps the Bun server `fetch` post-`listen()`, reaching into
  private `httpApp["router"]` / `httpApp["context"]` internals
  (`apps/api/src/main.ts:31-85`). Run global middleware for unmatched requests —
  this is the root-cause prerequisite for CORS in item 7.
- **e. Streaming vs Bun `idleTimeout`** — Bun's default 10s idle timeout severs SSE
  streams between frames; the portal wraps `fetch` to call `http.timeout(request, 0)`
  for its stream route (`apps/api/src/main.ts:37-44`). Streaming/SSE responses should
  disable the idle timeout automatically, and per-route timeout config should be
  first-class. Prerequisite for item 7 (SSE return type) and item 8 (subscriptions).

---

## 🎯 Next (v0.5.0) — feature parity where users expect it

### 6. Full ORM support track (`@nl-framework/orm` v2)
The ORM is currently a thin, solid repository layer (timestamps, soft delete,
declarative indexes, transactions, bulk ops, write notifier) — but it's not yet a
full ODM. Missing pieces, in build order:

**a. Field-level schema (`@Prop()` decorator).** `@Document` is class-level only
(`packages/orm/src/decorators/document.ts`); documents are persisted and returned as
plain objects — never hydrated into class instances (`mongo-repository.ts:481`
returns `{ ...doc, id }`). Add `@Prop({ type, default, enum, unique, index,
transform })`, hydrate results via class-transformer (already a framework
dependency), and derive indexes from props instead of only the `indexes: []` array.
_(field: devops-portal-v2)_ Because getters never run, the portal re-implements a
model getter as a GraphQL `@ResolveField`
(`notifications/resolvers/notification-settings.resolver.ts:30-35`) and litters
`as unknown as X` casts wherever methods are expected
(`workflow/workflow.service.ts:141,152`) — hydration deletes both workarounds.

**b. Validation on write.** The framework has class-validator wired into HTTP/GraphQL
pipes but the ORM never validates. Opt-in `validate: true` on `@Document` running
`transformAndValidate` (from `@nl-framework/core`) before insert/save.

**c. Entity lifecycle hooks.** `WriteNotifier` is a global stream; add per-entity
`@BeforeInsert()/@AfterInsert()/@BeforeUpdate()/@AfterUpdate()/@BeforeDelete()`
methods so entities can own their invariants (password hashing, slug generation).

**d. Relations & population.** No refs exist today. Add `@Ref(() => User)` storing
ObjectIds, `populate: ['author']` on find options (batched `$in` loads, not N+1), and
an embedded-document decorator for subdocument hydration. Pairs with a GraphQL
dataloader integration so federated resolvers don't N+1.

**e. Migrations.** Seeding + history exist (`SeedRunner`, seed-history store) but no
migration runner. Ordered up/down migration files, a `migrations` history collection
reusing the seed-history pattern, and CLI: `nl g migration`, `nl migrate up|down|status`.

**f. Optimistic concurrency & change streams.** Optional `@Version()` field checked
on save; `repository.watch()` exposing Mongo change streams — this also gives the
write notifier visibility into writes that bypass the repository, and feeds GraphQL
subscriptions (item 8) and devtools live views.

**g. Query caching.** Integrate the existing core cache stores (`InMemoryCacheStore`,
`RedisCacheStore`) as an opt-in read-through cache with invalidation driven by the
write notifier.

**h. Multi-connection support.** `OrmModule.forRoot/forRootAsync/forFeature` exist
but assume a single connection; add named connections
(`forRoot({ name: 'analytics', … })`, `forFeature([Doc], 'analytics')`) — a
prerequisite for the Postgres driver (item 17) coexisting with Mongo.

### 7. HTTP hardening: uploads, CORS, security
- **File uploads** — `router.ts:527` flattens `formData` into a plain object, so
  `File` entries are effectively unusable. Add a first-class `@UploadedFile()` /
  `@UploadedFiles()` decorator with size/mime validation, streaming to disk or
  directly into `@nl-framework/storage` adapters.
- **CORS** — no CORS handling exists anywhere in `packages/http`. Config-driven CORS
  (origins, credentials, preflight) on `HttpApplication` and the GraphQL server.
- **Security headers & rate limiting** — helmet-style default headers plus a
  `@Throttle()` guard backed by the in-memory/Redis cache stores.
- **Static file serving** and streaming/SSE responses as first-class return types
  (devtools already hand-rolls SSE internally — extract it).
  _(field: devops-portal-v2)_ The portal hand-rolls SSE twice — raw `ReadableStream`,
  manual framing, 25s heartbeats, subscribe/teardown lifecycle
  (`notifications/notifications.controller.ts`, `controllers/dso-chat.controller.ts`).
  An `@Sse()` decorator accepting an async iterator, owning framing/heartbeat/
  teardown, would delete both. Depends on fixes 24d (middleware on unmatched routes,
  for CORS) and 24e (idle-timeout exemption for streams).

### 8. GraphQL subscriptions + WebSocket support
No `@Subscription` decorator, no WS transport anywhere in the codebase. Code-first
GraphQL without subscriptions is a hard sell in 2026.
- WebSocket support in the Bun HTTP adapter (Bun has native `Bun.serve` websockets)
- `@Subscription()` decorator + pub/sub abstraction (in-memory + Redis, reusing the
  existing `RedisCacheStore` connection plumbing)
- `graphql-ws` protocol on `GraphqlApplication`
- ORM change streams (item 6f) as a subscription source

_(field: devops-portal-v2)_ The pub/sub abstraction must be pluggable from day one:
the portal's realtime fan-out is an in-memory `Map<userId, Set<Listener>>` hub plus a
raw Node `EventEmitter` (`notifications/services/notification-publisher.service.ts`,
`integrations/dso-chatbot/dso-chatbot.service.ts:51`) — both break the moment a
second API instance is deployed. Redis-backed pub/sub is the real requirement, not
just the in-memory default.

### 9. OpenAPI / Swagger generation for HTTP
Zero OpenAPI support today. The metadata already captured by route/param decorators +
class-validator DTOs is enough to emit an OpenAPI 3.1 document.
- `@nl-framework/openapi` package: document builder, `@ApiTags`/`@ApiResponse`-style
  decorators (or infer from existing metadata), Scalar/Swagger-UI serving.
- Pairs naturally with the devtools dashboard.

### 10. Health checks module (`@nl-framework/health`)
Nothing exists for k8s-style probes today. Terminus-equivalent: `/healthz` +
`/readyz` endpoints with built-in indicators for Mongo (ping), Redis, Dapr sidecar
(closes the transport TODO), disk/memory thresholds, and custom indicators —
surfaced in the devtools dashboard.

### 11. Role/permission authorization primitives (README-planned)
`AuthGuard`/`MultiTenantAuthGuard` exist; authorization doesn't.
- `@Roles()` / `@Permissions()` decorators + `RolesGuard` working across HTTP,
  GraphQL, and (post-item-4) microservices; integrate with Better Auth's
  organization/role plugins. Graduate multi-tenant support out of "experimental."
- _(field: devops-portal-v2)_ **`@Public()`** — the portal opts routes out of auth by
  calling `Reflect.defineMetadata(PUBLIC_ROUTE_METADATA_KEY, …)` at module scope
  (`controllers/health.controller.ts`); ship the decorator that wraps this key.
- _(field: devops-portal-v2)_ **`@CurrentUser()`** — the portal hand-builds it via
  `createGraphqlParamDecorator`, probing three context shapes
  (`rbac/decorators/current-user.decorator.ts`). `@nl-framework/auth` knows where the
  principal lives — expose it as a first-class param decorator for HTTP and GraphQL.

### 12. Devtools v2: debugging suite + dashboard UX overhaul
Today devtools only *observes* (aggregate metrics, dependency graph, model catalog)
— nothing helps debug a specific failing request. This item has three parts: a
foundation, the debugging panels built on it, and the UX overhaul of the existing
tabs.

**12.1 Foundation: request context + instrumentation bus.** There is no
`AsyncLocalStorage`, request ID, or correlation anywhere in the framework, and
`MetricsCollector` only records name/duration/ok per op
(`packages/devtools/src/metrics/collector.ts`). Build once, everything else follows:
- `RequestContext` in core (AsyncLocalStorage): request ID + metadata, flowing
  through HTTP, GraphQL, and microservice dispatch. Independently useful to users
  (`@Ctx()`-style access, log correlation) beyond devtools.
- A devtools **instrumentation bus**: typed events (`request:start`, `guard:run`,
  `pipe:run`, `handler:done`, `orm:query`, `log`, `exception`, `cache:hit|miss`,
  `event:published`) emitted by the existing interceptor/dispatcher hooks, captured
  into ring buffers (like `MetricsCollector` today), all tagged with the request ID.
  Zero-cost when devtools is disarmed.

**12.2 Debugging panels** (each is a dashboard tab/drawer over the bus):
- **Request inspector** (highest value — Telescope/NestJS-Devtools equivalent):
  list of recent requests → click one for the full pipeline timeline: middleware →
  guards → interceptors → pipes → handler → filters, each with duration and
  pass/deny/throw outcome, plus status, headers, and (size-capped, redacted)
  request/response bodies. GraphQL requests additionally show per-resolver timings,
  query text, and variables.
- **Error explorer**: every exception with stack trace, the filter that handled it,
  grouped by type/route with occurrence counts — and a link to the exact request
  that produced it (via request ID). The framework already sanitizes stack exposure
  for clients (commit `3b3bb1d`); devtools shows the *unsanitized* view locally.
- **ORM query inspector**: `WriteNotifier` covers writes only — add read
  instrumentation to `MongoRepository` (collection, filter shape, duration,
  returned count). Flag slow queries, `withDeleted` misuse, and repeated identical
  queries within one request (N+1 smell). Optional `explain()` on demand for a
  selected query. Feeds per-request DB time into the request inspector timeline.
- **Live log tail**: a devtools logger transport (the `LoggerTransport` interface
  exists; only console ships) streaming into the dashboard over the existing SSE
  channel — level/module filters, and click-through from a request to *its* log
  lines via the correlation ID.
- **Route & handler explorer**: every HTTP route, GraphQL operation, and message
  pattern with its applied guards/interceptors/pipes/filters (metadata is already
  captured by the shared decorators) — answers "why is this route returning 403"
  without grepping. Include a "send test request" button (non-prod only).
- **Scheduler panel**: `SchedulerRegistry` already tracks jobs — show each job's
  schedule, last/next run, last duration, last error; manual trigger button.
- **Config & cache panels**: resolved `ConfigService` values with secret redaction
  (path/pattern-based) and their source; cache store hit/miss rates per interceptor
  with key browser + invalidate button.
- **Boot report**: module init order and per-provider construction timings —
  makes slow startup and misordered lifecycle hooks visible.

Suggested build order: 12.1 → request inspector → ORM query inspector → error
explorer → log tail → the rest. Everything stays behind the existing
non-production guard and remains dependency-free/self-contained.

**12.3 Dashboard UX overhaul.** The introspection data is good; the presentation
collapses at real-world scale (observed: 27 modules / 117 providers / 358 edges →
unreadable label soup).

**Dependency graph** (`packages/devtools/src/http/dashboard-html.ts:161-213`):
- **Zoom & pan** — the SVG is a fixed 540px viewport with nodes clamped to its
  bounds; add wheel-zoom + drag-pan (viewBox transform) and node dragging/pinning
  (a `pin` flag exists in the sim but nothing sets it).
- **Labels on demand** — every node renders its full label permanently; show labels
  only for modules by default, others on hover/zoom threshold or via a tooltip.
- **Search & filters** — a search box that focuses/centres a node, kind toggles
  (hide providers/resolvers), and a "user code only" switch that collapses framework
  internals — the dozens of `Symbol(@nl-framework/orm/repository/default/…)` token
  nodes should be hidden or grouped by default, they dominate the canvas.
- **Click-to-focus subgraph** — clicking a node shows only its ingoing/outgoing
  neighborhood (1–2 hops) with an edge-direction indicator (arrowheads; `imports`
  vs `injects` is currently only a subtle stroke color).
- **Layout options** — group/cluster by module (hull or color region) or offer a
  hierarchical/DAG layout for module imports; pure force-directed at 180+ nodes
  never settles into something readable. Consider swapping the hand-rolled O(n²)
  sim for a small bundled lib (d3-force ~30 KB, still self-contained).

**Data models tab** — currently near-useless by construction: documents carry no
field metadata, so the table can only show collection/flags/indexes, and
"relations" are guessed from indexed `*Id` field names
(`packages/devtools/src/introspection/models.ts:90-113`).
- **Depends on ORM `@Prop()` (item 6a) and `@Ref()` (item 6d):** once fields and
  refs are real metadata, render a proper schema view — field name/type/optional/
  default per model, and *declared* (not inferred) relations.
- **ER diagram view** — models as boxes with fields, relation lines with
  cardinality; same zoom/pan/search treatment as the dependency graph.
- **Live collection info (opt-in)** — document counts, index sizes, and a sampled
  document per collection via the existing ORM connection (read-only, and gated by
  the same non-production guard).
- Until 6a lands, an interim fix: sample one document per collection to infer the
  field list at runtime, clearly marked as "sampled".

### 13. Documentation & polish debt
- READMEs for `packages/devtools` and `packages/storage` (currently none).
- Docs-site pages for scheduler, storage, devtools, platform/`NaelFactory`.
- Logger: ship file + JSON/HTTP transports (interface is pluggable; only console exists).
- CLI: generators for microservice message handlers (README-planned) + CLI test suite.

### 25. Transport-agnostic `ExecutionContext` + `Reflector` _(field: devops-portal-v2)_
Guards receive an untyped context and must sniff the transport themselves: the
portal's permissions guard takes `canActivate(context: any)`, probes for
`context.getRequest` to distinguish HTTP from GraphQL, defensively calls
`createGraphqlGuardExecutionContext`, and reads metadata with raw
`Reflect.getMetadata(PERMISSIONS_KEY, handler/classRef)`
(`rbac/guards/permissions.guard.ts:11-64`).
- A unified `ExecutionContext` with `getType()`, `getHandler()`, `getClass()`, and a
  uniform way to reach the request/user across HTTP, GraphQL, and (post-item-4)
  microservices — one guard implementation, three transports.
- A `Reflector` service (`get(key, [handler, class])` with merge semantics) so
  user code never touches `Reflect.getMetadata` directly.
- Aligns with item 4's microservice `ExecutionContext` and underpins item 11's
  `RolesGuard` and item 12.1's `RequestContext` — build this first.

### 26. Transactional outbox module _(field: devops-portal-v2)_
The ORM's `WriteNotifier` + session passthrough already provide the raw hooks; the
portal builds a full transactional outbox on top by hand for its MongoDB → SQL Server
legacy write-back (`apps/api/src/sync/sync-outbox.bootstrap.ts`): subscribes to
`connection.onWrite(EntityWriteEvent)`, filters a collection allow-list, inserts
`sync_outbox` rows via the raw `Db` (to avoid re-triggering the notifier), and
threads `event.session` through so the outbox row joins the ambient transaction.
Framework version:
- Declarative config: which collections/entities, an optional payload mapper, and an
  outbox collection managed by the framework (indexes, TTL/pruning).
- Writes that skip the notifier internally (no self-retrigger footgun).
- A drain-worker contract: lease/ack semantics, retry with backoff, dead-letter
  marking — bring-your-own transport (SQL, HTTP, queue) via a handler interface.
- Replay/reconcile hooks for nightly consistency sweeps.
- Natural sibling of item 19 (events) and item 6f (change streams); pairs with
  item 17's second-driver work for SQL targets.

---

## 🌅 Later (v0.6+) — expansion

### 14. `graphql` v17 upgrade
Blocked on Apollo publishing v17-compatible peer ranges for `@apollo/server`,
`@apollo/subgraph`, `@apollo/gateway`. Check quarterly; v17 brings incremental
delivery (`@defer`/`@stream`) which pairs well with item 8.

### 15. First-party Temporal workflow support (`@nl-framework/temporal`)
Durable, long-running workflows are a natural complement to the scheduler (cron) and
queues (jobs): Temporal covers sagas, human-in-the-loop flows, and multi-day processes
with retries/compensation built in. _(field: devops-portal-v2)_ This is already the
proven pattern in the field: the portal runs all recurring/background work in
separate Temporal workers (`apps/*-worker`) with `@temporalio/client` in the API,
bypassing `@nl-framework/scheduler` entirely — in-process cron can't offer the
retries, cross-instance single execution, and durability those jobs need.
- `TemporalModule.forRoot()` — connection/namespace config via `ConfigModule`, injects
  a `TemporalClient` provider for starting/signalling/querying workflows from any service.
- `@Activity()` class + `@ActivityMethod()` decorators so activities are DI-resolved
  framework providers (repositories, auth, storage all injectable).
- Worker lifecycle managed by the module: bundle workflows, register activities, start
  workers on app boot, graceful drain on shutdown (mirror the scheduler's SIGINT/SIGTERM
  handling).
- CLI generators: `nl g workflow`, `nl g activity`.
- Devtools integration: worker/task-queue status panel in the dashboard.
- **Spike first:** `@temporalio/worker` embeds a Rust core via Node native modules —
  validate it runs under Bun (or document a Node-worker escape hatch) before committing
  to the API surface.

### 16. Additional microservice transports (README-planned)
NATS first (best Bun story), then RabbitMQ, Kafka. Requires the transport interface
hardening from item 4 so transports are truly pluggable.

### 17. Additional database connectors (README-planned)
PostgreSQL is the obvious second driver (Bun ships a native `sql`/Postgres client).
Extract the driver interface from `MongoDriver` before adding a second implementation;
depends on multi-connection support (item 6h). _(field: devops-portal-v2)_ **SQL
Server belongs on this list too**: the portal must mirror writes into a legacy
`Devops_Stg` SQL Server database and today does it entirely outside the ORM
(hand-rolled outbox, item 26, drained by a custom worker —
`docs/migration/05-sql-writeback-sync.md` in the portal repo). A SQL Server
connector + named connections would make that a first-class secondary connection.

### 18. Job queue module
Scheduler covers cron/interval/timeout only. A `@nl-framework/queues` package
(BullMQ-style API on Redis) rounds out background processing: `@Processor()` /
`@Process()` decorators, retries, backoff, delayed jobs, devtools integration.

### 19. General event system (`@nl-framework/events`)
`WriteNotifier` is ORM-specific. A framework-wide `EventEmitterModule` with
`@OnEvent('order.created')` handlers, async dispatch, and wildcard patterns — the
local counterpart to Dapr pub/sub, and a migration path from in-process events to
microservice events. _(field: devops-portal-v2)_ The portal's workflow engine is a
poor-man's version of this: services expose `registerHandler(...)` and consumers
self-register inside `onModuleInit`
(`workflow/services/action-execution.service.ts`,
`notifications/workflow-notify.bootstrap.ts:43`, both pipeline-enrollment onboarding
services) — which is also what forces the `bootstrap: []` workaround (item 23).
`@OnEvent`-style declarative handlers discovered via `DiscoveryService` remove both
halves of that pattern.

### 20. Observability: OpenTelemetry integration
Devtools has an in-memory `MetricsCollector`, but nothing exports beyond the
dashboard. First-party OTel tracing/metrics: auto-instrument HTTP routes, GraphQL
resolvers, ORM operations (via write notifier + repository timing), microservice
handlers; OTLP exporter config via `ConfigModule`.

### 21. Storage & config enhancements
- Storage: local-filesystem adapter (dev/test) and GCS adapter; streaming uploads
  (feeds the HTTP upload pipeline, item 7). _(field: devops-portal-v2)_ The portal
  bypasses `AzureBlobStorageAdapter` and talks to `@azure/storage-blob` directly
  because it needs container auto-provision (`createIfNotExists`) and short-lived
  SAS download URLs (`apps/api/src/storage/storage.service.ts`); add
  `ensureContainer` and `getSignedUrl(ttl)` to the adapter contract so real apps
  can adopt it.
- Config: schema validation on boot (class-validator), multi-env secrets, live reload
  (README-planned).

### 22. Advanced config presets & unified exception primitives (README-planned)
Consolidate `ApplicationException` / HTTP / GraphQL / microservice error mapping into
one documented exception model with consistent serialization across transports.

---

## Suggested release train

| Version | Theme | Headline items |
|---------|-------|----------------|
| 0.4.0 | Trust & completeness | green test suite, `@nl-framework/testing`, microservices guards + `send()`, ORM quick wins, eager providers (23), field correctness fixes (24) |
| 0.5.0 | Parity features | full ORM track (@Prop, relations, migrations), subscriptions/WS, uploads/CORS, OpenAPI, health, roles + `@Public`/`@CurrentUser`, devtools v2 (request inspector + UX), `ExecutionContext`/`Reflector` (25), transactional outbox (26) |
| 0.6.0 | Expansion | NATS transport, Postgres + SQL Server drivers, queues, Temporal workflows, events, OTel, graphql 17 (if Apollo ready) |
