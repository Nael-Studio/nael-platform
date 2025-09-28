# Auth HTTP Example

This example shows how to plug `@nl-framework/auth` into an HTTP application while persisting users with the built-in ORM. It combines configuration-driven user seeding, request logging, role-based middleware, and simple controllers for registering, logging in, and accessing protected resources.

## Highlights

- Bootstraps `AuthModule.forRootAsync` to load default users from YAML configuration
- Persists accounts through `@nl-framework/orm` with a custom BetterAuth adapter
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
│   ├── persistence/          # ORM document + BetterAuth adapter backed by MongoDB
│   └── types.ts              # Shared config typing and payload helpers
└── package.json
```

## Getting started

1. Make sure MongoDB is running locally. The defaults expect a server listening at `mongodb://127.0.0.1:27017/nl-framework-auth-example`. You can start one quickly with Docker:

  ```bash
  docker run --name nl-auth-mongo -p 27017:27017 -d mongo:7
  ```

2. Build the core packages so the example can use local workspace dependencies:

   ```bash
   bun run build
   ```

3. Start the example (from the repo root or inside `examples/auth-http`):

   ```bash
   bun run --filter @nl-framework/example-auth-http start
   ```

  The server listens on `http://localhost:4100` by default. The bundled YAML configuration seeds an admin user (`admin@example.com` / `changeme`), configures the MongoDB connection, and sets the HTTP port. Sessions remain in memory for simplicity, but user records persist across restarts.

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

- Adjust `config/default.yaml` to seed different users, tweak MongoDB connection details, or change the session TTL
- Swap in a real BetterAuth adapter by installing the library in this example and providing `instance` via the module options
- Extend the request middleware in `main.ts` to add rate limiting, auditing, or multi-tenant routing
