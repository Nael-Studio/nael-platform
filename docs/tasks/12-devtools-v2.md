# 12 — Devtools v2: debugging suite + dashboard UX

**Goal:** turn devtools from an aggregate-metrics viewer into a per-request
debugger, then make the graph/models tabs usable at real scale. Build order:
12.1 → request inspector → ORM queries → errors → log tail → remaining panels →
12.3 UX. Everything stays behind the existing non-production guard
(`isProductionEnvironment`) and self-contained (inline HTML/JS, no CDN).

## Context — read first
- `packages/devtools/src/metrics/collector.ts` — ring-buffer pattern to reuse
- `packages/devtools/src/metrics/interceptors.ts` — existing HTTP/GraphQL timing
  hooks (the instrumentation bus replaces/extends these)
- `packages/devtools/src/http/dashboard-html.ts` — single-file dashboard (264
  lines; will grow substantially — split into `dashboard/` modules that
  concatenate at render time, still one HTTP response)
- `packages/devtools/src/http/registrar.ts` — API route registration
- `packages/devtools/src/metrics/sse.ts` — SSE channel (or the extracted
  `SseResponse` if spec 07 Task 5 landed)
- `packages/core/src/` — where `RequestContext` will live
- `packages/logger/src/` — `LoggerTransport` interface for the log tail
- `packages/orm/src/events/write-notifier.ts` + `repository/mongo-repository.ts`
  — write events exist; reads need instrumentation
- `packages/scheduler/src/scheduler.registry.ts` — job registry for the panel

## 12.1 Foundation

### RequestContext (in `@nl-framework/core`)
```ts
// packages/core/src/context/request-context.ts
interface RequestContextData { requestId: string; startedAt: number;
  kind: 'http' | 'graphql' | 'message'; name: string;   // route/op/pattern
  [key: symbol | string]: unknown }
RequestContext.run(data, fn)       // AsyncLocalStorage.run
RequestContext.current(): RequestContextData | undefined
RequestContext.id(): string | undefined
```
- Entered at the top of HTTP dispatch (router), GraphQL request pipeline, and
  message dispatch. `requestId` = `crypto.randomUUID()`, or inbound
  `x-request-id` header when present (echo it on the response).
- Zero devtools coupling — this is a core feature. Logger integration: when a
  context is active, `Logger` appends `requestId` to structured output
  automatically (option to disable).
- Tests in core: nesting, isolation across concurrent async chains, absent
  context safe.

### Instrumentation bus (in devtools)
```ts
// packages/devtools/src/instrumentation/bus.ts
type DevtoolsEvent =
  | { type: 'request:start' | 'request:end'; requestId; kind; name; at; durationMs?; status?; error? }
  | { type: 'step'; requestId; step: 'middleware'|'guard'|'interceptor'|'pipe'|'handler'|'filter';
      token: string; at; durationMs; outcome: 'pass'|'deny'|'throw'|'transform' }
  | { type: 'orm:query'; requestId?; collection; op; filterShape; durationMs; count?; at }
  | { type: 'exception'; requestId?; name; message; stack; handledBy?; at }
  | { type: 'log'; requestId?; level; context; message; at }
  | { type: 'cache'; requestId?; store; key; hit: boolean; at };
```
- `DevtoolsBus.emit(event)` no-ops (single boolean check) when devtools is
  disarmed. Per-type bounded ring buffers (reuse `MetricsCollector`'s eviction
  approach; sizes configurable via module options, defaults ~500 requests /
  2000 queries / 500 exceptions / 5000 logs).
- Request-scoped assembly: `GET /api/requests/:id` joins all buffers by
  `requestId`.
- Emission points: extend the existing devtools interceptors for
  request/step events (guards/pipes need hooks — if the http router exposes no
  seam around guard/pipe execution, add an optional lightweight callback array
  `onPipelineEvent` to the router, default empty = zero cost).
- Body capture: request/response bodies size-capped (default 8 KB, truncated
  flag) and redacted by key patterns (`password`, `token`, `secret`,
  `authorization` — configurable). Off by default; `captureBodies: true` option.

## 12.2 Panels (each = API route(s) + dashboard tab)

### Request inspector
- `GET /api/requests?limit&kind&status` → list (id, name, kind, status,
  duration, at). New SSE event on the existing stream announces fresh requests.
- Detail view: vertical timeline of `step` events with durations & outcomes,
  ORM queries inline at their timestamps, log lines interleaved, exception at
  point of throw. GraphQL: resolver-level steps (hook the field-timing the
  metrics interceptor already approximates; extend to per-resolver via Apollo
  plugin `executionDidStart.willResolveField` — devtools already integrates at
  the Apollo level, verify in `metrics/interceptors.ts`).

### ORM query inspector
- Instrument `MongoRepository` reads: wrap `find/findOne/count/aggregate/...`
  emitting `orm:query` with **filter shape** (keys + operators only, values
  redacted: `{ tenantId: '…', createdAt: { $gt: '…' } }`).
- ORM must not depend on devtools: add an optional `QueryObserver` interface to
  the ORM module options (`observers?: QueryObserver[]`); devtools registers one.
  WriteNotifier events map into the same stream.
- Panel: slowest queries table, repeated-identical-query-per-request flag (N+1
  smell: same collection+filterShape ≥3× in one request), per-collection
  aggregates. "Explain" button → `POST /api/orm/explain` re-runs a captured
  query with `.explain('executionStats')` (**non-prod guard + read-only ops
  only**; refuse writes).

### Error explorer
- Hook: exception filters' execution path (core/http/graphql) emits `exception`
  events including which filter handled it. Group by `name + first stack frame`;
  list shows count, last seen, sample message; detail links to the request.

### Log tail
- `DevtoolsLoggerTransport` implementing the logger's transport interface,
  registered by the devtools module when armed; pushes into the log ring buffer
  + live SSE. Dashboard tab: level/context filter, pause, requestId
  click-through both directions.

### Route & handler explorer
- `GET /api/routes`: every HTTP route, GraphQL operation, message pattern with
  its guard/interceptor/pipe/filter token names (read the same metadata the
  dispatchers read — core's shared decorator metadata + registries).
- "Try it" button for HTTP routes: browser-side `fetch` from the dashboard page
  (no server proxy needed; same origin).

### Scheduler / Config / Cache panels + boot report
- Scheduler: read `SchedulerRegistry` (job name, type, schedule, lastRun/next,
  lastDurationMs, lastError — add these fields to the registry if absent);
  `POST /api/scheduler/:job/run` manual trigger.
- Config: resolved `ConfigService` tree with redaction (same key patterns as
  body capture; values → `'•••'`, type preserved).
- Cache: instrument core cache stores via the same optional-observer pattern as
  ORM; hit/miss per key prefix; `DELETE /api/cache/:key`.
- Boot report: core application context records module init order + per-provider
  construction ms during bootstrap when a flag is set (devtools sets it);
  `GET /api/boot`.

## 12.3 Dashboard UX overhaul (graph + models)
Graph (`dashboard-html.ts` renderGraph):
1. viewBox zoom (wheel, cursor-anchored) + drag-pan + node drag (sets `pin`).
2. Labels: modules always; others only when `zoom > 1.5` or hovered (tooltip).
3. Toolbar: text search (match → center + focus), kind checkboxes, "hide
   framework internals" toggle **on by default** — internal = label matches
   `/^Symbol\(@nl-framework\//` or `/^Symbol\(nl[:-]/`; when hidden, collapse
   them into a badge count on their consumer node.
4. Click node → focus mode: render only ≤2-hop neighborhood; arrowhead markers;
   `imports` vs `injects` in the legend; Esc restores.
5. Cluster hulls per module (convex hull polygon, low-opacity fill by module
   color hash) OR a "group by module" toggle that pins module anchors on a grid.
   Keep the hand-rolled sim unless it fights back — if replaced, vendor
   d3-force into the inline bundle (no CDN).

Models tab:
- After ORM 6a/6d land: fields table per model (name, type, required, default)
  + declared relations; ER diagram reusing the graph's zoom/pan/search machinery
  (models as boxes, relation edges w/ cardinality).
- Before 6a (interim, ship first): "sampled schema" — `GET /api/models/:name/
  sample` reads ONE document via the ORM connection, infers field names/types,
  UI labels it *sampled*. Opt-in module option `sampleDocuments: true`.
- Live stats (same opt-in): `estimatedDocumentCount()` + index sizes per
  collection.

## Acceptance criteria
- Devtools disarmed = zero overhead: a benchmark-style test asserting no bus
  subscribers and no logger transport registered; router pipeline callback array
  empty.
- Request inspector shows a full timeline for: an HTTP request with guard +
  pipe + one Mongo query + one log line; a GraphQL op with two resolvers; a
  message-pattern dispatch (after spec 04).
- All new API routes under the existing base path + non-prod guard; bodies/
  config/queries redacted per patterns; explain endpoint refuses writes.
- Graph usable at 200 nodes: internals hidden by default, search focuses, zoom
  smooth (rAF-throttled), focus mode ≤2 hops.
- Existing 7 devtools test files still pass; each panel gets its own test file
  (bus events → API response shape; HTML tab rendering can be smoke-tested by
  string inclusion).
