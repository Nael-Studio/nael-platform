# @nl-framework/devtools

A self-contained, non-production debugging dashboard for Nael apps — live metrics,
a dependency graph, model introspection, and a **per-request debugger**. Fully
inline (no CDN assets); everything sits behind a fail-safe production guard.

## Installation

```bash
bun add -D @nl-framework/devtools
```

## Quick start

```ts
import { NaelDevtoolsModule } from '@nl-framework/devtools';

@Module({
  imports: [
    NaelDevtoolsModule.forRoot({
      enabled: process.env.NODE_ENV !== 'production',
      // basePath defaults to /__nael
    }),
  ],
})
export class AppModule {}
```

Open `http://localhost:<port>/__nael`.

## Production guard

The dashboard is **disabled by default** and **blocked when `NODE_ENV=production`**
unless you explicitly set `allowInProduction: true` (which logs a loud warning).
When disarmed, the instrumentation bus `emit(...)` calls are a single boolean check
away from a no-op, so there is effectively zero overhead.

## Tabs

- **Performance** — live p50/p95/p99 per operation over SSE.
- **Requests** — the per-request debugger. Lists recent HTTP/GraphQL/message
  requests; click one for a timeline that interleaves pipeline steps, ORM queries
  (filter shape only), log lines, and exceptions — plus an N+1 smell flag.
- **ORM queries** — slowest reads and per-collection roll-ups. Requires a
  `QueryObserver`-instrumented connection (devtools registers one automatically).
- **Errors** — exceptions grouped by type + first stack frame.
- **Logs** — a live log tail with level/context and request-id click-through.
- **Dependency graph** / **Data models** — module/provider graph and `@Document`
  introspection.

## How it works

### RequestContext (from `@nl-framework/core`)

A framework-neutral `AsyncLocalStorage` context opened at the top of HTTP, GraphQL,
and message dispatch. It carries a `requestId` (an inbound `x-request-id` header
when present — echoed on the response — otherwise a fresh UUID). The logger appends
`requestId` to structured output automatically when a context is active (opt out
with `includeRequestContext: false`).

```ts
import { RequestContext } from '@nl-framework/core';
RequestContext.id();        // current request id, or undefined
RequestContext.current();   // { requestId, kind, name, startedAt }
```

### Instrumentation bus

Events (`request:start/end`, `step`, `orm:query`, `exception`, `log`, `cache`) fan
out to **bounded per-type ring buffers** (sizes configurable via `bufferSizes`) and
to live SSE subscribers. `GET /api/requests/:id` joins the buffers by `requestId`.

### ORM query instrumentation

The ORM exposes an optional `QueryObserver` (it never depends on devtools). Reads
(`find`/`findOne`/`count`/`aggregate`) report their **filter shape** — keys and
operators only, values redacted (`{ tenantId: '…' }`) — never values.

```ts
OrmModule.forRoot({ driver, observers: [myObserver] }); // devtools registers its own
```

## Options

| Option | Default | Notes |
|--------|---------|-------|
| `enabled` | `false` | Master switch. |
| `allowInProduction` | `false` | Escape hatch; logs a warning. |
| `basePath` | `/__nael` | Dashboard + API mount point. |
| `maxSamples` | `2000` | Performance ring-buffer size. |
| `bufferSizes` | see below | Per-type debugger buffers. |

`bufferSizes` defaults: `{ requests: 500, steps: 4000, queries: 2000, exceptions: 500, logs: 5000, cache: 2000 }`.

## License

Apache-2.0
