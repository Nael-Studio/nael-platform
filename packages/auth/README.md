# @nl-framework/auth

Authentication toolkit built around Better Auth with first-class HTTP routes, guards, middleware, and GraphQL helpers for session-aware NL Framework applications.

## Installation

```bash
bun add @nl-framework/auth better-auth
```

## Highlights

- **HTTP routes** – register opinionated Better Auth endpoints (sign up, session management, passwordless) in one call.
- **GraphQL integration** – secure fields with directives or the provided `SessionGuard` so resolvers stay declarative.
- **Extensible strategies** – plug in custom adapters or extend providers through dependency injection without rewriting scaffolding.

## Quick start

```ts
import { Module } from '@nl-framework/core';
import { registerBetterAuthHttpRoutes, SessionGuard, AuthModule } from '@nl-framework/auth';
import { Controller, Get, UseGuards } from '@nl-framework/http';

@Controller('/profile')
@UseGuards(SessionGuard)
class ProfileController {
  @Get('/')
  me() {
    return { message: 'Secure profile payload' };
  }
}

@Module({
  imports: [
    AuthModule.forRoot({
      providers: ['email'],
    }),
  ],
  controllers: [ProfileController],
})
export class AppModule {
  constructor() {
    registerBetterAuthHttpRoutes();
  }
}
```

## License

Apache-2.0
