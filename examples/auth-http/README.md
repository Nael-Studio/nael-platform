# Better Auth HTTP Example

This example bootstraps an HTTP application that wires the native [`better-auth`](https://better-auth.com) server into the nl-framework stack. It shows how to:

- Load configuration with `@nl-framework/config`
- Share a MongoDB connection between the ORM and Better Auth via the new auth module helpers
- Auto-mount the Better Auth request handler under a configurable `/api/auth/*` prefix via the provided module
- Attach the authenticated session to every request with the provided middleware

## Prerequisites

- [Bun](https://bun.sh) v1.1.20 or newer
- A running MongoDB instance (local Docker is fine)
- A strong Better Auth secret (set through `BETTER_AUTH_SECRET` or `config/default.yaml`)

## Quick start

```bash
bun install
cd examples/auth-http
BETTER_AUTH_SECRET="your-64-byte-secret" bun run src/main.ts
```

By default the server listens on <http://127.0.0.1:4100>. The `BetterAuthHttpModule` automatically registers every native Better Auth endpoint under `/api/auth/*`, so you can hit paths like `/api/auth/sign-up/email` or `/api/auth/get-session` immediately. A sample protected route is still available at `/profile`.

## Configuration

All runtime settings live in `config/default.yaml`:

```yaml
server:
  host: 127.0.0.1
  port: 4100
auth:
  baseUrl: http://127.0.0.1:4100
  secret: change-me-in-env
  routePrefix: /api/auth
mongo:
  uri: mongodb://127.0.0.1:27017/nl-framework-auth-example
  db: nl-framework-auth-example
```

Override any value with environment variables (e.g. `MONGODB_URI`, `MONGODB_DB`, `BETTER_AUTH_SECRET`).

Change `auth.routePrefix` to mount the Better Auth API under a different base path without touching application code.

## Testing the flow

1. Start the server with the command above.
2. Use the Better Auth client (or a simple `curl` request) to hit `/api/auth/sign-up/email` and create a user:

   ```bash
   curl -i -c cookies.txt \
     -H "Content-Type: application/json" \
     -X POST http://127.0.0.1:4100/api/auth/sign-up/email \
     -d '{"name":"Ada Lovelace","email":"ada@example.com","password":"Str0ngPassw0rd!","rememberMe":true}'
   ```

   The response sets Better Auth cookies automatically which Postman (or `curl` with `-b`/`-c`) will reuse.
3. Call `/api/auth/get-session` to inspect the resolved session payload.
4. Access `/profile` to fetch the authenticated user. Unauthenticated requests receive a `401` JSON response.

## How it works

- `AppModule` configures MongoDB via `OrmModule`, shares the connection with Better Auth using `createMongoAdapterFromDb`, and imports `BetterAuthHttpModule.register()` to expose the native routes.
- `main.ts` keeps the logging and middleware pipeline lightweight—the Better Auth HTTP module owns route registration while the middleware attaches request sessions.
- Controllers retrieve the active session through `getRequestAuth`, demonstrating how downstream code can read authentication state without re-validating cookies.

Feel free to extend the example by enabling additional Better Auth plugins or connecting the session data to your own domain modules.
