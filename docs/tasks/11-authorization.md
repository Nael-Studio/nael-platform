# 11 — Authorization primitives: @Roles / @Permissions

**Goal:** first-party RBAC decorators + guard working uniformly across HTTP,
GraphQL, and (after spec 04) microservices, integrating with Better Auth.

## Context — read first
- `packages/auth/src/` — `AuthGuard`, `MultiTenantAuthGuard`, how the session/user
  lands on the request context today (this determines where roles are read from)
- `packages/auth/src/orm/` adapter — where user records live
- Better Auth plugin docs for `organization` / `admin` plugins (roles source)
- `packages/core/src/decorators/` `SetMetadata` — decorator mechanics
- `examples/auth-http` `TenantGuard` — the pattern users currently hand-roll

## API

```ts
@Roles('admin', 'editor')            // ANY-of semantics
@Permissions('billing:write')        // ALL-of semantics
@UseGuards(RolesGuard)               // or registered globally after AuthGuard
```

- `RolesGuard` reads the authenticated principal placed by `AuthGuard`
  (**hard requirement: document that RolesGuard must run after AuthGuard**; if
  guard ordering is registration order, assert principal presence and throw a
  configuration-hinting error when absent).
- Role/permission extraction is pluggable:
  `BetterAuthModule.forRoot({ authorization: { rolesResolver?: (session, user)
  => string[]; permissionsResolver?: ... } })`. Default resolver: Better Auth
  `user.role` (string or string[]) and, when the organization plugin is active,
  the active-org member role.
- Metadata merge: method-level replaces controller-level (no union — matches
  guard semantics users expect; test this).
- Failure: authenticated but lacking role → 403 `ForbiddenException` (HTTP),
  `FORBIDDEN` GraphQL error; unauthenticated → 401 (AuthGuard's job, unchanged).
- `@Public()` continues to bypass both.

## Multi-tenant
`MultiTenantAuthGuard` path: roles resolve per active tenant. The
`rolesResolver` receives the tenant id; document the pattern in the
multi-tenant example. Graduating multi-tenant out of "experimental"
(README:628) requires: integration test matrix (two tenants, role isolation)
+ docs page updates.

## Deliverables
1. `packages/auth/src/authorization/` — decorators, guard, resolvers, tokens.
2. Works in all three dispatchers; microservice variant lands only if spec 04
   Task 1 is merged (else raise in PR description and ship HTTP+GraphQL).
3. Tests: any-of/all-of semantics, method-overrides-controller, missing
   principal config error, per-tenant isolation, `@Public` bypass.
4. Update `examples/auth-http` + `auth-graphql` to use `@Roles` instead of
   hand-rolled checks; docs-site auth section page.
