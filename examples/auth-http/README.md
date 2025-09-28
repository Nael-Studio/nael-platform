# Auth HTTP Example

This example shows how to plug `@nl-framework/auth` into an HTTP application. It combines configuration-driven user seeding, request logging, role-based middleware, and simple controllers for registering, logging in, and accessing protected resources.

## Highlights

- Bootstraps `AuthModule.forRootAsync` to load default users from YAML configuration
- Demonstrates the in-memory BetterAuth fallback adapter—no external dependency required
- Provides login and registration endpoints plus authenticated `/me` and admin-only routes
- Reuses the framework's HTTP middleware system to wrap protected routes with `createBetterAuthMiddleware`

## Project structure

```
examples/auth-http
├── config/
│   └── default.yaml          # App name, seeded users, host/port defaults
├── src/
│   ├── app.module.ts         # Wires ConfigModule + AuthModule with async options
│   ├── auth.controller.ts    # Handles registration and login flows
│   ├── protected.controller.ts# Uses middleware-attached session data
│   ├── main.ts               # Bootstraps NaelFactory and applies middleware
│   └── types.ts              # Shared config typing and payload helpers
└── package.json
```

## Getting started

1. Build the core packages so the example can use local workspace dependencies:

   ```bash
   bun run build
   ```

2. Start the example (from the repo root or inside `examples/auth-http`):

   ```bash
   bun run --filter @nl-framework/example-auth-http start
   ```

   The server listens on `http://localhost:4100` by default. The bundled YAML configuration seeds an admin user (`admin@example.com` / `changeme`) and sets the HTTP port.

## Try it out

Authenticate and fetch a profile:

```bash
# Log in with the seeded admin account
curl -s \
  -X POST http://localhost:4100/auth/login \
  -H "content-type: application/json" \
  -d '{"email":"admin@example.com","password":"changeme"}'

# Use the returned token (replace YOUR_TOKEN) to call the protected route
curl -s http://localhost:4100/me \
  -H "authorization: Bearer YOUR_TOKEN"
```

Hit the admin-only endpoint:

```bash
curl -s http://localhost:4100/admin/insights \
  -H "authorization: Bearer YOUR_TOKEN"
```

Register another user:

```bash
curl -s \
  -X POST http://localhost:4100/auth/register \
  -H "content-type: application/json" \
  -d '{"email":"reader@example.com","password":"p@ssword","roles":["reader"]}'
```

## Experiment further

- Adjust `config/default.yaml` to seed different users or change the session TTL passed to `AuthModule`
- Swap in a real BetterAuth adapter by installing the library in this example and providing `instance` via the module options
- Extend the request middleware in `main.ts` to add rate limiting, auditing, or multi-tenant routing
