# Multi-tenant Better Auth GraphQL Example

GraphQL sample that:

- Resolves tenants per request (via `x-tenant-id` header).
- Loads Better Auth config per tenant (from an in-memory service you can swap for DB).
- Exposes native Better Auth HTTP routes for all tenants.
- Uses the multi-tenant guard for GraphQL resolvers to surface session data.

## Running

1) Start MongoDB locally (default: `mongodb://127.0.0.1:27017`).  
2) Set secrets or rely on defaults:
   ```bash
   export BETTER_AUTH_SECRET_DEFAULT=change-me-default
   export BETTER_AUTH_SECRET_ACME=change-me-acme
   ```
3) Run:
   ```bash
   bun run examples:auth-mt-graphql
   ```

Queries:

```graphql
query Viewer {
  viewer {
    tenant
    authenticated
    user { id email }
  }
}
```

Remember to send `x-tenant-id` and auth cookies from a sign-in performed against `/api/auth/*`.
