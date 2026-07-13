# 10 — `@nl-framework/health`

**Goal:** k8s-style liveness/readiness endpoints with pluggable indicators,
Terminus-equivalent.

## Context — read first
- `packages/config/src/` module pattern (`forRoot`) — copy the module shape
- `packages/orm/src/connection/mongo-connection.ts` — what a Mongo ping needs
- `packages/core/src/cache/` Redis store — reuse its client for Redis checks
- `packages/microservices/src/transport/dapr-transport.ts` — sidecar healthz URL
  (coordinate with spec 04 Task 3; share the probe helper if it landed)
- `packages/devtools/src/` — where the health summary will surface later (emit
  nothing devtools-specific here; devtools reads the same service)

## API

```ts
HealthModule.forRoot({
  path: '/healthz',            // liveness  (process is up — always 200 unless shutting down)
  readinessPath: '/readyz',    // readiness (indicators)
  indicators: [
    mongoIndicator(),                    // pings via injected connection (token-based, optional)
    redisIndicator(),                    // PING via cache store if configured
    daprIndicator({ appId: 'orders' }),  // GET sidecar /v1.0/healthz
    memoryIndicator({ maxRssBytes: 512 * 1024 * 1024 }),
    diskIndicator({ path: '/', minFreeBytes: 1e9 }),
  ],
  timeoutMs: 3_000,            // per indicator
})
```

`HealthIndicator = { name: string; check(): Promise<HealthResult> }` with
`HealthResult = { status: 'up' | 'down'; details?: Record<string, unknown> }`.
Custom indicators: any provider implementing the interface, registered via the
`indicators` array or an `@HealthIndicator()` class decorator picked up through
core's `DiscoveryService`.

Response shape (200 when all up, 503 otherwise):
```json
{ "status": "ok", "checks": { "mongo": { "status": "up", "details": { "latencyMs": 2 } } } }
```

## Implementation notes
- Indicators run in parallel with individual timeouts (a hung Mongo must not
  block the endpoint past `timeoutMs`; timeout = down with `reason: "timeout"`).
- Built-in indicators must degrade cleanly when their dependency isn't installed
  or configured: resolve tokens as **optional** injections; constructing
  `mongoIndicator()` in an app without the ORM should throw a clear config error
  at boot, not at request time.
- Liveness goes 503 only after shutdown begins (hook the application's shutdown
  lifecycle so rolling deploys drain correctly).
- No auth on these routes by default; document how to keep them off public
  ingress. Ensure the global `AuthGuard` pattern used in examples can exempt
  them (`@Public()` on the internal controller).

## Acceptance criteria
- New package `packages/health` with tests: all-up 200, one-down 503 with per-
  check detail, timeout handling, shutdown flips liveness, optional-dependency
  boot errors.
- Wired into one example app; README + docs-site page.
