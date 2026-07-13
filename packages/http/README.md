# @nl-framework/http

HTTP routing primitives for the Nael Framework featuring controllers, route decorators, middleware, and guard integration.

## Installation

```bash
bun add @nl-framework/http
```

Import `reflect-metadata` in your entry point if you haven’t already:

```ts
import 'reflect-metadata';
```

## Highlights

- **Annotation-based routing** – declare controllers, routes, and guards using decorators like `@Controller`, `@Get`, and `@UseGuards`.
- **Request context** – access params, query, headers, and user state through typed handler signatures.
- **Automatic DTO validation** – request bodies annotated with class-validator rules are transformed with `class-transformer`, stripped of unknown properties, and rejected with a structured 400 response when invalid.
- **Auth-friendly** – pair with `@nl-framework/auth` to secure routes using session guards or middleware.

## Quick start

```ts
import { Controller, Get, Post, Body, Param } from '@nl-framework/http';
import { Module } from '@nl-framework/core';
import { bootstrapHttpApplication } from '@nl-framework/platform';
import { IsEmail, IsOptional, IsString } from 'class-validator';

class CreateUserDto {
  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  name?: string;
}

@Controller('/users')
class UsersController {
  private readonly users = new Map<string, { id: string; email: string; name?: string }>();

  @Get('/')
  list() {
    return Array.from(this.users.values());
  }

  @Get('/:id')
  findOne(@Param('id') id: string) {
    return this.users.get(id);
  }

  @Post('/')
  create(@Body() body: CreateUserDto) {
    const id = crypto.randomUUID();
    const user = { id, email: body.email, name: body.name };
    this.users.set(id, user);
    return user;
  }
}

@Module({ controllers: [UsersController] })
class AppModule {}

const app = await bootstrapHttpApplication(AppModule, { port: 3000 });
await app.start();
console.log('HTTP server ready on http://localhost:3000');
```

## Production hardening

All of the following are **opt-in** via `createHttpApplication` options (or the
matching decorators). Existing apps that pass nothing are unaffected.

### File uploads

`multipart/form-data` requests keep their `File` entries (repeated field names
collect into arrays). Inject them with `@UploadedFile` / `@UploadedFiles`:

```ts
import { UploadedFile, UploadedFiles, UploadedFileHandle } from '@nl-framework/http';

@Post('/avatar')
upload(
  @UploadedFile('avatar', { maxSize: 5_000_000, mimeTypes: ['image/png', 'image/jpeg'] })
  file: UploadedFileHandle,
) {
  // file.filename / mimeType / size / arrayBuffer() / stream() / saveTo(path)
  return file.pipeTo(this.storage, `avatars/${file.filename}`); // streams into any @nl-framework/storage adapter
}

@Post('/gallery')
gallery(@UploadedFiles({ maxSize: 5_000_000 }) files: UploadedFileHandle[]) {}
```

Violations throw `PayloadTooLargeException` (413) / `UnsupportedMediaTypeException`
(415); a missing required file throws 400. Pass `{ required: false }` for optional files.

### CORS

```ts
createHttpApplication(AppModule, {
  cors: { origin: ['https://app.example.com'], credentials: true, maxAge: 600 },
  // or `cors: true` to allow any origin
});
```

`origin` accepts a string, array, `RegExp`, or `(origin) => boolean`. Preflight
`OPTIONS` is answered with 204 before routing. `credentials: true` combined with
`origin: '*'` throws at config time. (GraphQL served through Apollo's own handler
is not covered — front it with the HTTP app or configure CORS there.)

### Security headers

```ts
createHttpApplication(AppModule, {
  security: true, // helmet-core defaults
  // or configure: { frameOptions: 'SAMEORIGIN', hsts: { maxAge: 31536000, includeSubDomains: true }, csp: "default-src 'self'" }
});
```

Defaults: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`,
`Referrer-Policy: no-referrer`. HSTS is **never** forced (safe for localhost) —
enable it explicitly. Handler-set headers are never overwritten.

### Rate limiting

```ts
import { Throttle, SkipThrottle, createThrottleGuard, registerHttpGuard } from '@nl-framework/http';

registerHttpGuard(createThrottleGuard()); // in-memory by default; pass { store } for Redis

@Throttle({ limit: 100, windowMs: 60_000 })
@Controller('/api')
class ApiController {
  @Get('/open') @SkipThrottle() open() {}
}
```

Fixed-window counting keyed by `throttle:{route}:{clientKey}`. The client key is
the first `x-forwarded-for` hop (override with `keyResolver`). Over the limit →
429 with `Retry-After`.

### Static files + SSE

```ts
createHttpApplication(AppModule, {
  serveStatic: { prefix: '/assets', root: './public', maxAge: 3600 },
});
```

Served with `Bun.file` — ETag from size+mtime, 304 handling, and a path-traversal
guard. Return an `SseResponse` from any handler for Server-Sent Events with
headers, heartbeat, and client-disconnect cleanup handled for you:

```ts
import { SseResponse } from '@nl-framework/http';

@Get('/events')
events() {
  return new SseResponse((emit) => {
    const t = setInterval(() => emit({ event: 'tick', data: { at: Date.now() } }), 1000);
    return () => clearInterval(t);
  });
}
```

## License

Apache-2.0
