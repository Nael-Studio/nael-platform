# Multi-tenant Better Auth HTTP Example

Minimal HTTP app showing how to:

- Resolve tenants per request (via `x-tenant-id` header).
- Load Better Auth config from a tenant service (which could hit a DB in your project).
- Expose native Better Auth HTTP routes for all tenants.
- Protect app routes with the multi-tenant guard/middleware.

## Running

1) Start MongoDB locally (default: `mongodb://127.0.0.1:27017`).  
2) Set a few secrets (or rely on the sample defaults):
   ```bash
   export BETTER_AUTH_SECRET_DEFAULT=change-me-default
   export BETTER_AUTH_SECRET_ACME=change-me-acme
   ```
3) Run:
   ```bash
   bun run examples:auth-mt-http
   ```

Send requests with `x-tenant-id: acme` or omit for the default tenant:

```bash
curl -i -H "x-tenant-id: acme" http://127.0.0.1:4300/api/auth/get-session
curl -i -H "x-tenant-id: acme" http://127.0.0.1:4300/profile
```
