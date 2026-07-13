# 03 — Test coverage for load-bearing packages

**Goal:** minimum credible coverage for the packages that currently have little or
none. Use `@nl-framework/testing` (spec 02) where it helps; plain `bun test`
otherwise. Current counts: `platform` 0, `storage` 0, `cli` 0, `mcp-server` 0,
`http` 1, `config` 1, `logger` 1.

## Per-package requirements

### packages/platform (`NaelFactory`) — highest priority
Read `packages/platform/src/` first. Tests (`packages/platform/tests/`):
- factory creates an HTTP-only app; a registered controller route responds
  (via `handle(request)` / test client, no port binding)
- factory creates HTTP + GraphQL app sharing one DI container: a provider
  registered once is the same instance seen by a controller and a resolver
- gateway options path constructs without throwing (mock subgraph list; do not
  perform real composition/network)
- options validation: bad/missing config produces the framework's clear
  validation errors, not stack-trace soup

### packages/http
- router matrix: static vs param (`/:id`) vs wildcard routes; method matching;
  404 and 405 behavior; `Version()` routing
- pipes: each built-in (`ParseIntPipe`, `ParseFloatPipe`, `ParseBoolPipe`,
  `ParseArrayPipe`, `DefaultValuePipe`, `ValidationPipe`) happy + failure path
  (failure → the framework's 400 shape)
- guards: allow, deny (403 shape), guard ordering, `@Public`-style metadata
  bypass if applicable
- exception filters: thrown `HttpException` vs unknown error; filter precedence
  (method > controller > global) — consistent with spec 01's contract
- interceptors: order, short-circuit (cache interceptor returning early)

### packages/storage
Unit-test both adapters with **mocked SDK clients** (inject/mock at module
boundary — `@aws-sdk/client-s3`'s `S3Client.send` and Azure's
`BlockBlobClient`): upload, download, delete, presigned URL, error mapping.
No network. If the adapters construct clients internally with no seam, add an
optional constructor param accepting a preconstructed client (public API
addition — export types accordingly).

### packages/cli
- generator tests: run `nl g module/service/controller/resolver/model` against a
  temp dir (use `fs.mkdtemp` under the OS temp dir), assert produced file paths +
  content snapshots compile with `bunx tsc --noEmit` against a minimal tsconfig
- `new app` smoke: scaffold, then verify `package.json` deps reference the current
  framework version (see `scripts/bump-version.ts` conventions)

### packages/config & packages/logger
- config: env-specific YAML load precedence, missing-file behavior, nested key
  access via `ConfigService.get('a.b.c')`
- logger: level filtering, child/context loggers, a custom transport receives
  structured `LogMessage` entries

## Acceptance criteria
- Every listed behavior has at least one test; all pass with `bun test` at root.
- No test requires network, Mongo, Dapr, or cloud credentials.
- Do not chase coverage numbers — the listed matrices are the bar.
