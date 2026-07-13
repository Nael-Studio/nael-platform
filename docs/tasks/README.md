# Implementation task breakdown

Companion to [`ROADMAP.md`](../../ROADMAP.md). Each file here is an **agent-executable
spec** for one roadmap epic: enough context, file references, API sketches, and
acceptance criteria that an implementation agent (Opus/Sonnet) can do the work
without re-deriving the plan. Numbers match roadmap items.

## How to execute a spec

1. Read the spec fully, then read every file listed in its **Context** section
   before writing code.
2. Follow existing conventions: each package builds with `bunx tsc --build
   tsconfig.build.json`, tests are `bun test` colocated in `packages/<pkg>/tests/`,
   ESM only, no new runtime dependencies unless the spec allows it.
3. Mirror existing patterns — the HTTP package's `guards/` + `interceptors/`
   (execution-context / utils / metadata / registry file split) is the house style
   for cross-cutting features.
4. Every task must land with tests. Run `bun run build && bun test` at repo root
   before declaring done. Do not fix unrelated failing tests unless the spec says so.
5. Public API changes require: export from the package's `src/index.ts`, a README
   section in that package, and (if user-facing) a docs-site page stub.
6. Keep packages dependency-light. `@nl-framework/devtools` must stay fully
   self-contained (no CDN assets — the dashboard is a single inline-HTML page).

## Order of execution (dependencies)

```
01 green-test-suite ──┐
02 testing-package  ──┼── 03 test-coverage
                      │
04 microservices (guards, send)          — independent
05 orm-quick-wins                        — independent
06 orm-full (a→h in order)               — 6a blocks 12.2 models tab, 6h blocks Postgres
07 http-hardening (uploads need storage) — CORS needs 14/24d; SSE needs 14/24e
08 graphql-subscriptions                 — WS transport first; 6f optional source
09 openapi                               — independent (reads existing metadata)
10 health                                — independent; closes Dapr TODO from 04
11 authorization                         — after 04 for microservice guard parity;
                                           @Public/@CurrentUser on 14/25 context
12 devtools-v2                           — 12.1 foundation first; models tab after 6a
13 later epics (Temporal, queues, events, OTel, transports, Postgres) — sketches only
14 portal-field-gaps (items 23–26)       — 23/24 independent quick wins (0.4);
                                           25 before 11; 26 after orm write-notifier
                                           review; carries deltas into 02/05/06/07/08/11/13
```

## Index

| Spec | Epic | Target release |
|------|------|----------------|
| [01-green-test-suite.md](01-green-test-suite.md) | Fix 4 failing tests | 0.4 |
| [02-testing-package.md](02-testing-package.md) | `@nl-framework/testing` | 0.4 |
| [03-test-coverage.md](03-test-coverage.md) | Coverage for platform/http/storage/cli | 0.4 |
| [04-microservices.md](04-microservices.md) | Guards, send(), health, auto-subscribe | 0.4 |
| [05-orm-quick-wins.md](05-orm-quick-wins.md) | Atomic save, aggregate, pagination, … | 0.4 |
| [06-orm-full.md](06-orm-full.md) | @Prop, validation, hooks, refs, migrations, … | 0.5 |
| [07-http-hardening.md](07-http-hardening.md) | Uploads, CORS, security headers, throttle, static/SSE | 0.5 |
| [08-graphql-subscriptions.md](08-graphql-subscriptions.md) | WS + @Subscription | 0.5 |
| [09-openapi.md](09-openapi.md) | OpenAPI 3.1 generation | 0.5 |
| [10-health.md](10-health.md) | `@nl-framework/health` | 0.5 |
| [11-authorization.md](11-authorization.md) | @Roles/@Permissions | 0.5 |
| [12-devtools-v2.md](12-devtools-v2.md) | Debugging suite + dashboard UX | 0.5 |
| [13-later-epics.md](13-later-epics.md) | Temporal, queues, events, OTel, Postgres, NATS | 0.6+ |
| [14-portal-field-gaps.md](14-portal-field-gaps.md) | Eager providers, field fixes, ExecutionContext/Reflector, outbox (items 23–26) | 0.4–0.5 |
