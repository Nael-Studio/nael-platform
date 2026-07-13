# @nl-framework/openapi

Generate an **OpenAPI 3.1** document from the metadata nl-framework already
captures — routes, param sources, and `class-validator` DTOs — and serve it with
a self-contained viewer. No runtime dependency on any Swagger library, and **no
CDN or network access at runtime**.

## Installation

```bash
bun add @nl-framework/openapi
```

## Usage

```ts
import { Module } from '@nl-framework/core';
import { OpenApiModule } from '@nl-framework/openapi';

@Module({
  imports: [
    OpenApiModule.forRoot({
      title: 'My API',
      version: '1.0.0',
      // path: '/openapi.json',   // JSON document route (default)
      // ui: '/docs',             // viewer route (pass `false` to disable)
      servers: [{ url: 'https://api.example.com' }],
      securitySchemes: {
        bearer: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
    }),
  ],
})
export class AppModule {}
```

The document is built once at boot and cached. Existing apps gain docs with
**zero decorator changes** — path parameters are discovered from the route
template even when the handler reads them off the request context.

## Schema derivation

Schemas come from `class-validator` metadata plus reflected design types:

| Decorator | Result |
| --- | --- |
| `@IsString` / `@IsInt` / `@IsNumber` / `@IsBoolean` / `@IsDate` | `type` |
| `@IsEmail` / `@IsUUID` | `type: string` + `format` |
| `@IsEnum(E)` | `enum` with inferred type |
| `@Min` / `@Max` | `minimum` / `maximum` |
| `@Length` / `@MinLength` / `@MaxLength` | `minLength` / `maxLength` |
| `@Matches(re)` | `pattern` |
| `@IsOptional` | dropped from `required` |
| `@ValidateNested` (+ `@Type`) | `$ref` into `components.schemas` (cycle-safe) |
| `{ each: true }` | wrapped in an array of item schemas |

A validated `@Body()` DTO becomes the `requestBody` and implies a `400`
response. A handler return type that is a class becomes the `200` response
schema.

## Enrichment decorators

All are metadata-only and override/extend the derived values:

- `@ApiTags(...tags)` — controller- or method-level grouping
- `@ApiOperation({ summary, description, deprecated })`
- `@ApiResponse(status, { type?, description? })`
- `@ApiSecurity(name)`
- `@ApiExcludeEndpoint()`

## Programmatic API

```ts
import { buildOpenApiDocument, classToJsonSchema } from '@nl-framework/openapi';

const document = buildOpenApiDocument([UsersController], { title: 'API', version: '1.0.0' });
const schema = classToJsonSchema(CreateUserDto);
```

## Versioning

Routes declaring `@Version()` are emitted under a version-prefixed path
(`/v2/users` by default; configurable via `versionPrefix`).
