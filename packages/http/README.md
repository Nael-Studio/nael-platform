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
- **Auth-friendly** – pair with `@nl-framework/auth` to secure routes using session guards or middleware.

## Quick start

```ts
import { Controller, Get, Post, Body, Param } from '@nl-framework/http';
import { Module } from '@nl-framework/core';
import { bootstrapHttpApplication } from '@nl-framework/platform';

@Controller('/users')
class UsersController {
  private readonly users = new Map<string, { id: string; email: string }>();

  @Get('/')
  list() {
    return Array.from(this.users.values());
  }

  @Get('/:id')
  findOne(@Param('id') id: string) {
    return this.users.get(id);
  }

  @Post('/')
  create(@Body() body: { email: string }) {
    const id = crypto.randomUUID();
    const user = { id, email: body.email };
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

## License

Apache-2.0
