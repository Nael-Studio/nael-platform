# 07 — HTTP hardening: uploads, CORS, security headers, throttling, static/SSE

**Goal:** production-shaped HTTP layer. Each task is independent; uploads is the
largest.

## Context — read first
- `packages/http/src/router/router.ts` — request dispatch; body parsing around
  line 527 (`formData` flattened via `Object.fromEntries`, destroying `File`s)
- `packages/http/src/http-application.ts` — where `Bun.serve` options and global
  middleware live
- `packages/http/src/guards/` — pattern for the throttle guard
- `packages/storage/src/` — adapters the upload pipeline can stream into
- `packages/devtools/src/metrics/sse.ts` — hand-rolled SSE to generalize

## Task 1 — File uploads
1. Fix parsing: when content-type is `multipart/form-data`, keep `File` entries
   intact (Bun's `request.formData()` already yields `File` objects — the bug is
   only the flattening; multiple same-name fields must collect into arrays).
2. Decorators in `packages/http/src/decorators/`:
   `@UploadedFile(name?, options?)` / `@UploadedFiles(options?)` where options =
   `{ maxSize?: number; mimeTypes?: string[]; required?: boolean }`. Violations →
   400 `PayloadTooLargeException` / `UnsupportedMediaTypeException` (add to the
   HttpException family).
3. The injected value: `UploadedFileHandle` = `{ filename, mimeType, size,
   arrayBuffer(), stream(), saveTo(path), pipeTo(storageAdapter, key) }` — the
   last one streams into any `@nl-framework/storage` adapter without buffering
   (verify adapters accept streams; if S3 adapter needs `Upload` from
   `@aws-sdk/lib-storage` for streaming, that dep is allowed in **storage**, not
   http).
4. Tests: single/multiple files, size/mime rejection shapes, fields+files mixed
   form, streaming to a temp-dir fake adapter.

## Task 2 — CORS
`createHttpApplication({ cors: true | CorsOptions })` where `CorsOptions =
{ origin: string | string[] | RegExp | ((origin) => boolean); methods?; headers?;
credentials?; maxAge?; exposeHeaders? }`. Handle preflight OPTIONS before routing
(short-circuit 204 with headers); reflect allowed origin (never `*` when
`credentials: true` — throw at config time). Apply to the GraphQL server path too
(check how `GraphqlApplication` serves HTTP; if it goes through the same router,
it's free). Tests: preflight, simple request, disallowed origin (no headers, not
an error), credentials+wildcard config error.

## Task 3 — Security headers
`security: true | SecurityOptions` option applying helmet-core defaults:
`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`,
`Referrer-Policy: no-referrer`, `Strict-Transport-Security` (only when the option
`hsts` set — don't force it for localhost dev), optional CSP string passthrough.
Merge with (never overwrite) handler-set headers. Tests per header + merge rule.

## Task 4 — Rate limiting
`@Throttle({ limit: 100, windowMs: 60_000 })` method/controller decorator +
`ThrottleGuard` registered like other guards. Store: `CacheStore` from core
(in-memory default, Redis capable) using fixed-window keys
`throttle:{route}:{clientKey}`; `clientKey` from `x-forwarded-for` first hop or
socket address, overridable via option `keyResolver(ctx)`. Over limit → 429 with
`Retry-After`. `@SkipThrottle()` escape hatch. Tests: under/over limit, window
reset (inject a clock — do not sleep), per-route isolation, custom keyResolver.

## Task 5 — Static files + SSE as first-class responses
- `serveStatic: { prefix: '/assets', root: './public', maxAge? }` option using
  `Bun.file` (etag from size+mtime; 304 handling; path-traversal guard — resolve
  and verify the path stays under root).
- Extract devtools' SSE into `packages/http`: handler returns
  `new SseResponse(asyncIterable | subscribe callback)`; router detects and wires
  headers/keep-alive/heartbeat; devtools refactored to consume it.
- Tests: static hit, 304, traversal attempt → 404, SSE emits events + closes on
  client abort.

## Acceptance criteria
- All features opt-in via `createHttpApplication` options; zero behavior change
  for existing apps that pass nothing.
- README + docs-site "techniques" pages updated per feature.
