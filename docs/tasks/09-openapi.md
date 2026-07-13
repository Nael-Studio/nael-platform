# 09 — OpenAPI 3.1 generation (`@nl-framework/openapi`)

**Goal:** emit an OpenAPI 3.1 document from metadata the framework already
captures, serve it + a viewer, with optional enrichment decorators.

## Context — read first
- `packages/http/src/router/router.ts` + route decorators — what metadata exists
  per route (method, path, param sources)
- `packages/http/src/decorators/` param decorators (`@Body`, `@Param`, `@Query`,
  `@Headers`) — how design types are stored (`design:paramtypes`)
- `class-validator` metadata storage (`getMetadataStorage()`) — source for
  constraint→schema mapping
- Versioning support (`Version()`) — versions become separate paths or servers
- How `HttpApplication` exposes route tables (needed to enumerate at boot)

## Package
New `packages/openapi` (`@nl-framework/openapi`). Deps: core + http. No runtime
dep on any swagger lib — the document is hand-built JSON; the viewer is embedded
Scalar/Swagger-UI **self-hosted** (vendored minified asset in the package, no CDN).

## Task 1 — Schema derivation from DTOs
`classToJsonSchema(dtoClass)`: walk `class-validator` metadata + `design:type`:
- `@IsString/@IsInt/@IsNumber/@IsBoolean/@IsDate/@IsEnum/@IsArray/@ValidateNested`
  → types; `@IsOptional` → drop from `required`; `@Min/@Max/@Length/@Matches/
  @IsEmail/@IsUUID` → constraints/formats.
- Nested DTOs → `$ref` into `components.schemas` (cycle-safe: register before
  recursing).
- Fields with no decorators: fall back to `design:type` with a `description:
  "unvalidated"` marker.

## Task 2 — Document builder
`buildOpenApiDocument(app, config)`: enumerate routes → for each: path (convert
`:id` → `{id}`), method, params (path/query/header from decorator metadata with
derived schemas), requestBody from `@Body` DTO, responses (default: 200 with
handler return `design:returntype` if a class, else empty; plus 400 when a
validated body exists). `config` = `{ title, version, servers, securitySchemes }`.

## Task 3 — Enrichment decorators (optional per route)
`@ApiTags(...tags)`, `@ApiOperation({ summary, description, deprecated })`,
`@ApiResponse(status, { type?, description })`, `@ApiSecurity(name)`,
`@ApiExcludeEndpoint()`. Metadata-only, follow `SetMetadata` conventions from core.

## Task 4 — Serving
`OpenApiModule.forRoot({ path: '/openapi.json', ui: '/docs' | false })` —
registers the JSON route + UI route on the existing router. UI page is a single
self-contained HTML string (devtools dashboard pattern). Document is built once
at boot and cached.

## Acceptance criteria
- `examples/basic-http` gains OpenAPI with zero decorator changes (baseline doc
  valid per `openapi-schema` 3.1 — validate in a test against the official JSON
  Schema, vendored as a test fixture).
- Snapshot test of the generated document for a representative controller
  (params, DTO body, enum, nested DTO, versioned route).
- Enrichment decorators override/extend derived values.
- No CDN/network at runtime.
