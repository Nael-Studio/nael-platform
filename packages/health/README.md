# @nl-framework/health

Kubernetes-style **liveness** and **readiness** endpoints with pluggable
indicators — a Terminus-equivalent for nl-framework.

## Installation

```bash
bun add @nl-framework/health
```

## Usage

```ts
import { Module } from '@nl-framework/core';
import {
  HealthModule,
  mongoIndicator,
  redisIndicator,
  daprIndicator,
  memoryIndicator,
  diskIndicator,
} from '@nl-framework/health';

@Module({
  imports: [
    HealthModule.forRoot({
      path: '/healthz',          // liveness (process is up)
      readinessPath: '/readyz',  // readiness (indicators)
      indicators: [
        mongoIndicator(),                             // pings the ORM connection
        redisIndicator({ token: REDIS_CLIENT }),      // PINGs a Redis client
        daprIndicator({ appId: 'orders' }),           // GET sidecar /v1.0/healthz
        memoryIndicator({ maxRssBytes: 512 * 1024 * 1024 }),
        diskIndicator({ path: '/', minFreeBytes: 1e9 }),
      ],
      timeoutMs: 3_000,          // per indicator
    }),
  ],
})
export class AppModule {}
```

### Response shape

Readiness returns `200` when every check is up, `503` otherwise:

```json
{ "status": "ok", "checks": { "mongo": { "status": "up", "details": { "latencyMs": 2 } } } }
```

Liveness returns `200` while the process is up and flips to `503` once shutdown
begins (hooked to `onModuleDestroy`), so rolling deploys drain correctly.

## Indicators

An indicator is `{ name: string; check(): Promise<HealthResult> }`. Indicators
run in parallel with an individual timeout — a hung dependency reports `down`
with `reason: "timeout"` instead of blocking the endpoint.

Built-ins degrade cleanly when their dependency isn't configured. `mongoIndicator()`
resolves the ORM connection as an **optional** injection but fails fast at
**boot** (not request time) when neither `@nl-framework/orm` is installed nor a
connection is registered.

### Custom indicators

Implement the interface and either add it to the `indicators` array or annotate a
provider with `@HealthIndicator()` — annotated providers are discovered through
core's `DiscoveryService`:

```ts
import { Injectable } from '@nl-framework/core';
import { HealthIndicator, type HealthResult } from '@nl-framework/health';

@HealthIndicator()
export class QueueIndicator implements HealthIndicator {
  readonly name = 'queue';
  async check(): Promise<HealthResult> {
    return { status: 'up', details: { depth: 0 } };
  }
}
```

## Security

The probe routes are mounted on an internal controller marked `@Public()` (via
the shared HTTP metadata key), so a global `AuthGuard` exempts them. Keep
`/healthz` and `/readyz` off public ingress in production.
