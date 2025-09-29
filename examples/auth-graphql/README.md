# Authenticated GraphQL Example

This example pairs the NL Framework GraphQL module with Better Auth to protect resolvers using shared guards. It exposes the Better Auth REST endpoints under `/api/auth/*` (served by the HTTP app) and a GraphQL API protected by the same `AuthGuard` used for HTTP routes.

## Features

- GraphQL resolvers built with the code-first decorators.
- Global `AuthGuard` execution shared between HTTP and GraphQL.
- `@Public()` decorator to opt specific resolvers out of auth.
- In-memory Better Auth adapter for quick local experimentation.

## Prerequisites

- [Bun](https://bun.sh) v1.1.20 or newer.
- A running MongoDB instance (defaults to `mongodb://127.0.0.1:27017/nl-framework-auth-example`).
- Optional: `curl` or an HTTP client to call the Better Auth endpoints.

## Getting started

Install dependencies from the monorepo root if you have not already:

```sh
bun install
```

Start the example from the repository root:

```sh
bun run --filter @nl-framework/example-auth-graphql start
```

The server boots both HTTP (for Better Auth) and GraphQL endpoints:

- HTTP: `http://127.0.0.1:4201`
- GraphQL: `http://127.0.0.1:4202/graphql`

## Creating an account and session

1. **Sign up** a user via Better Auth REST endpoint:

   ```sh
   curl -i \
     -X POST \
     -H "Content-Type: application/json" \
     -d '{"email":"demo@example.com","password":"P@ssword1"}' \
     http://127.0.0.1:4201/api/auth/sign-up/email
   ```

2. **Sign in** to receive the Better Auth session cookies:

   ```sh
   curl -i \
     -X POST \
     -H "Content-Type: application/json" \
     -d '{"email":"demo@example.com","password":"P@ssword1"}' \
     http://127.0.0.1:4201/api/auth/sign-in/email
   ```

   Copy the `Set-Cookie` values from the response and include them in subsequent requests (your HTTP client may track them automatically).

## Exercising the GraphQL API

Open Apollo Sandbox or Postman at `http://127.0.0.1:4202/graphql` and run:

```graphql
query PublicGreeting {
  health
}
```

This query is decorated with `@Public()` and succeeds without credentials.

To call the protected `viewer` query you must send the Better Auth cookies from the sign-in step:

```graphql
query Viewer {
  viewer {
    id
    email
    roles
  }
}
```

If the cookies are missing or expired, the GraphQL guard responds with an HTTP 401-style GraphQL error message.

## Shutdown

Press `Ctrl+C` in the terminal to stop the servers.
