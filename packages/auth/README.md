# @nl-framework/auth

Authentication toolkit built around Better Auth with first-class HTTP routes, guards, middleware, and GraphQL helpers for session-aware Nael applications.

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

## Authorization (RBAC)

First-party `@Roles` / `@Permissions` decorators and a `RolesGuard` that work
uniformly across HTTP, GraphQL, and microservice message handlers.

```ts
import { Controller } from '@nl-framework/core';
import { Get } from '@nl-framework/http';
import { Roles, Permissions } from '@nl-framework/auth';

@Controller('admin')
@Roles('admin', 'editor')          // ANY-of: holds admin OR editor
export class AdminController {
  @Get()
  dashboard() { /* ... */ }

  @Permissions('billing:write')    // ALL-of: must hold every permission
  @Get('billing')
  billing() { /* ... */ }
}
```

Register the guard **after** `AuthGuard` (global guards run in registration
order) so the authenticated principal is on the context when `RolesGuard` runs:

```ts
import { registerHttpGuards } from '@nl-framework/http';
import { AuthGuard, RolesGuard } from '@nl-framework/auth';

registerHttpGuards(AuthGuard, RolesGuard);
```

For a standalone GraphQL resolver, list them in order:
`@UseGuards(AuthGuard, RolesGuard)`. For microservices, add
`registerMicroserviceGuard(RolesGuard)` from `@nl-framework/microservices`.

**Semantics**

- `@Roles` is ANY-of; `@Permissions` is ALL-of.
- Method-level metadata **replaces** controller-level (no union) — matching the
  guard semantics users expect.
- Authenticated but lacking the role → `403 Forbidden` (HTTP) / `FORBIDDEN`
  GraphQL error. Unauthenticated → `401` (handled by `AuthGuard`, unchanged).
- `@Public()` bypasses both guards.
- If `RolesGuard` reaches a constrained handler with **no** principal, it throws
  a configuration error — a signal that it ran before `AuthGuard`.

**Pluggable resolvers** — configure where roles/permissions are read from. The
default reads Better Auth's `user.role` (string or `string[]`) and, when the
organization plugin is active, the active-org member role.

```ts
BetterAuthModule.forRoot({
  betterAuth: { /* ... */ },
  database,
  authorization: {
    rolesResolver: (session, user, tenantId) => /* string[] */,
    permissionsResolver: (session, user, tenantId) => /* string[] */,
  },
});
```

Under multi-tenant auth, `tenantId` (the active tenant) is passed to the
resolvers so roles resolve **per tenant** — the same user can be `admin` in one
tenant and `viewer` in another.

Not using `BetterAuthModule`? Spread `createAuthorizationProviders(options?)`
into your module's `providers`.

## License

Apache-2.0
