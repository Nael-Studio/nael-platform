# 14 — Portal field gaps (roadmap items 23–26 + spec deltas)

**Source:** production use of framework 0.3.6 in devops-portal-v2
(`~/Documents/projects/devops-portal-v2`, API at `apps/api`). Every item here cites
the portal workaround it deletes — use those files as the acceptance oracle: after
the framework feature lands, the portal code in question must be removable.

This spec covers the four new roadmap items (23–26) and lists **deltas** that field
evidence adds to existing specs (02, 05, 06, 07, 08, 11, 13).

---

## Item 23 — Eager providers (target 0.4.0)

### Context
- `packages/core/src/discovery/discovery-service.ts` — providers are lazy
- `packages/core/src/` — container, module compiler, lifecycle hook dispatch
- Portal workarounds: `apps/api/src/app.module.ts:142-143`,
  `apps/api/src/rbac/rbac.module.ts:31`,
  `apps/api/src/pipeline-enrollment/pipeline-enrollment.module.ts:33-35`,
  `apps/api/src/notifications/notifications.module.ts:45` — all use `bootstrap: []`
  purely to force `onModuleInit` side effects to run.

### Work
1. During module init, after providers are registered, instantiate every provider
   whose class prototype declares `onModuleInit` or `onApplicationBootstrap`
   (check the prototype — do NOT instantiate to find out). Run their lifecycle
   hooks in the normal phase ordering.
2. Add `@Eager()` decorator (core) and `eager: true` on custom provider objects for
   classes that need eager construction without lifecycle hooks.
3. Dev-mode warning (via logger) if a provider declares a lifecycle hook but was
   pruned/never reachable — should become impossible after (1); keep as a guard.
4. `bootstrap: []` keeps working; README documents it as manual override.

### Acceptance
- A provider with `onModuleInit` in a module with empty `bootstrap` runs its hook
  exactly once at startup. Test in `packages/core/tests/`.
- Existing examples boot unchanged; no double-instantiation of providers already
  listed in `bootstrap: []`.

---

## Item 24 — Field-reported correctness fixes (target 0.4.0)

### 24a. ORM connection single-flight
- Context: `packages/orm/src/connection/` (`MongoConnection.ensureConnection`),
  portal patch `apps/api/src/config/database.config.ts:24-43`.
- Work: memoize the in-flight connect promise so concurrent callers share one
  connection attempt; reset the memo on failure so retry is possible.
- Acceptance: test firing 10 parallel `ensureConnection()` calls → exactly one
  driver connect; failure then retry succeeds.

### 24b. Non-fatal index sync
- Context: `autoIndex` path in ORM bootstrap; portal replacement
  `apps/api/src/database/ensure-indexes.bootstrap.ts` (per-index try/catch over
  `getRegisteredDocuments()`).
- Work: `autoIndex: true | 'non-fatal' | false`. In `'non-fatal'` mode wrap each
  `createIndex` individually, collect `{ collection, index, error }` failures, log a
  summary, expose the report (return value / event) — never throw at boot.
- Acceptance: with a duplicate-laden collection and a unique index declared, boot
  succeeds in `'non-fatal'` mode with the failure reported; strict mode still throws.

### 24c. Validation: validator-less `@InputType`
- Context: `transformAndValidate` pipe wiring (core/http/graphql); portal note in
  `apps/api/src/integrations/azure-devops/dto/create-repository.input.ts:6-8` —
  inputs with zero class-validator decorators die on `forbidUnknownValues` with an
  empty-issues "Validation failed".
- Work: registered `@InputType`/DTO classes are known types — skip the
  `forbidUnknownValues` rejection for them (or auto-apply an `@Allow()`-equivalent).
  Ensure validation errors always carry per-property issue details.
- Acceptance: an `@InputType` with no validators passes through the pipe; invalid
  input on a decorated class still fails with populated issues.

### 24d. Global middleware on unmatched routes & OPTIONS
- Context: `packages/http/src/router.ts` middleware chain (runs only after route
  match); portal wrapper `apps/api/src/main.ts:31-85` (re-wraps Bun `fetch`,
  touches private `httpApp["router"]`/`httpApp["context"]`).
- Work: run global middleware for requests that match no route (including OPTIONS
  preflight), with a well-defined "no handler" continuation that yields the 404.
  This is the prerequisite for spec 07's CORS module — coordinate.
- Acceptance: a global middleware observes an OPTIONS request to an unregistered
  path and can short-circuit a response; default behavior without middleware is
  unchanged (404).

### 24e. Streaming vs Bun idleTimeout + per-route timeout
- Context: Bun `server.timeout(request, seconds)`; portal patch
  `apps/api/src/main.ts:37-44` (forces `timeout(request, 0)` for its SSE route).
- Work: when a handler returns a streaming response (`ReadableStream` / future
  `@Sse()`), the HTTP layer calls `timeout(request, 0)` automatically; add
  `timeout` to route options for explicit control.
- Acceptance: an SSE-style streamed response stays open > 10s under Bun defaults.

---

## Item 25 — `ExecutionContext` + `Reflector` (target 0.5.0)

### Context
- `packages/http/src/guards/` execution-context/utils/metadata/registry split
  (house style), `packages/graphql/src` guard context
  (`createGraphqlGuardExecutionContext`), spec 04's microservice context.
- Portal evidence: `apps/api/src/rbac/guards/permissions.guard.ts:11-64` —
  `canActivate(context: any)`, transport sniffing, raw `Reflect.getMetadata`.

### Work
1. Core `ExecutionContext` interface: `getType(): 'http' | 'graphql' | 'rpc'`,
   `getHandler()`, `getClass()`, `switchToHttp()/switchToGraphql()/switchToRpc()`
   accessors, plus a uniform `getRequest()`/user access path shared with
   `@nl-framework/auth`.
2. HTTP, GraphQL, and (with spec 04) microservice dispatchers construct it; guards,
   interceptors, and pipes receive the same shape everywhere.
3. `Reflector` provider in core: `get(key, target)`,
   `getAllAndOverride(key, [handler, class])`, `getAllAndMerge(...)`.
4. Migrate built-in guards (`AuthGuard`, future `RolesGuard`) onto it.

### Acceptance
- One guard implementation passes identical tests mounted on an HTTP route and a
  GraphQL resolver. `Reflector.getAllAndOverride` resolves handler-over-class
  metadata. No breaking change for existing `canActivate` signatures (old context
  still accepted during a deprecation window).

---

## Item 26 — Transactional outbox module (target 0.5.0)

### Context
- `packages/orm/src/` — `WriteNotifier`, `EntityWriteEvent` (carries `session`),
  `connection.onWrite`, `getRegisteredDocuments()`.
- Portal reference implementation: `apps/api/src/sync/sync-outbox.bootstrap.ts`
  (collection allow-list → `sync_outbox` rows via raw `Db`, joins the ambient
  transaction via `event.session`, avoids notifier re-trigger) and the portal doc
  `docs/migration/05-sql-writeback-sync.md` (drain worker + nightly reconcile).

### Work
1. `OutboxModule.forRoot({ collections | entities, map?, collection: 'nl_outbox',
   prune })` — subscribes to the write notifier, writes outbox rows inside the
   originating session when present, using an internal write path that does not
   re-emit write events.
2. Managed outbox collection: status/leasing indexes, TTL/prune policy.
3. Drain contract: `OutboxProcessor` interface with lease/ack/nack semantics, retry
   with backoff, dead-letter marking — transport-agnostic (SQL, HTTP, queue
   implementations live in user code or later packages).
4. Replay/reconcile API: re-enqueue by filter/time-range for consistency sweeps.
5. Decide packaging: `@nl-framework/outbox` vs an `orm` submodule — prefer a
   separate package to keep `orm` dependency-light; it may depend on `orm`.

### Acceptance
- A repository `save()` inside `withTransaction` produces the entity write and its
  outbox row atomically (both or neither on abort).
- Outbox writes do not re-trigger `WriteNotifier`.
- A test processor drains rows exactly once under concurrent drainers (lease test);
  a failing processor leaves the row for retry, then dead-letters after N attempts.

---

## Deltas to existing specs (fold in when executing those specs)

| Spec | Delta from field evidence |
|------|---------------------------|
| 02-testing-package | Ship the `InMemoryRepo<T>` fake the portal hand-rolled (`apps/api/src/forms/form.service.spec.ts`) as the canonical repository test double. |
| 05-orm-quick-wins | Add `upsert(filter, doc)` (portal drops to raw `collection.updateOne` — `azure-devops-scan.service.ts:129-144`); opt-in loose/extra-field read mode (portal reads via `(repo as any).collection`); GraphQL `Paginated<T>()` factory + `PaginationArgs` (portal `common/models/paginated-response.model.ts`, `common/dto/pagination.args.ts`). |
| 06-orm-full | 6a hydration acceptance: portal's `@ResolveField` re-implementation of a model getter (`notification-settings.resolver.ts:30-35`) becomes deletable. |
| 07-http-hardening | SSE/`@Sse()` acceptance: portal's two hand-rolled SSE controllers become deletable; depends on 24d (middleware/OPTIONS) and 24e (idleTimeout). |
| 08-graphql-subscriptions | Redis pub/sub is required, not optional — portal's in-memory hubs break multi-instance (`notification-publisher.service.ts`, `dso-chatbot.service.ts:51`). |
| 11-authorization | Add `@Public()` (wraps `PUBLIC_ROUTE_METADATA_KEY` — portal `health.controller.ts` sets it via raw `Reflect.defineMetadata`) and `@CurrentUser()` (portal `rbac/decorators/current-user.decorator.ts` probes three context shapes). Build on item 25's `ExecutionContext`. |
| 13-later-epics | Postgres epic: add SQL Server connector (portal's `Devops_Stg` write-back target); storage epic: `ensureContainer` + `getSignedUrl(ttl)` on adapters (portal bypasses `AzureBlobStorageAdapter` — `apps/api/src/storage/storage.service.ts`); Temporal epic: portal's `apps/*-worker` layout is the reference consumer. |
