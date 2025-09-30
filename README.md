# Nael Platform

Nael Platform is a [NestJS](https://nestjs.com/)-inspired application framework built on top of [Bun](https://bun.sh). It exists because we love Nest's developer ergonomics but grew frustrated with how heavy the experience can feel in modern tooling stacks: long boot times, CommonJS-centric builds that complicate native ESM adoption, and slow feedback loops when pairing with newer libraries that expect pure ESM runtimes. By embracing Bun end-to-end—TypeScript transpilation, test running, package management, and production serving—we get dramatically faster startup, tighter iteration loops, and first-class ESM compatibility while keeping the modular architecture, decorators, and structured tooling that make Nest approachable. The project is actively under development and the API surface is expected to evolve.

## Current Capabilities

- Modular core built around dependency injection and application contexts
- HTTP module with decorator-driven routing and middleware support
- GraphQL module with schema-first resolvers and federation-ready tooling
- Federation gateway wrapper that embeds Apollo Gateway into the shared server
- Structured logging with pluggable transports (console out-of-the-box)
- Driver-based ORM module with TypeORM-style registration, MongoDB support, timestamps, and seeding hooks
- Better Auth integration with shared session handling across REST and GraphQL (including the `BetterAuthGraphqlModule`)
- Config module with layered YAML loading, async factories, and feature-scoped injection helpers

Explore the `examples/` folder for runnable samples that demonstrate the current functionality:

- `examples/basic-http` – minimal REST-style greeting controller
- `examples/auth-http` – HTTP API with authentication flows, ORM-backed user persistence, and role-protected routes via `@nl-framework/auth`
- `examples/auth-graphql` – unified REST + GraphQL auth example exposing the Better Auth APIs through GraphQL resolvers
- `examples/basic-graphql` – standalone GraphQL server with resolver discovery
- `examples/federated-graphql` – subgraph service suitable for Apollo Federation
- `examples/federation-gateway` – single-port HTTP + GraphQL gateway using NaelFactory
- `examples/mongo-orm` – REST API backed by the Mongo ORM with seeding and soft deletes

## Roadmap

The roadmap tracks both the pieces that already landed and the ones we still plan to ship ahead of the first stable release.

### Completed

- [x] Modular application core with dependency injection and scoped contexts
- [x] HTTP module with decorator-driven routing, middleware, and Bun-native server
- [x] GraphQL module with schema-first resolver discovery and federation hooks
- [x] NaelFactory-powered Apollo Federation gateway running alongside HTTP routes
- [x] Structured logger with pluggable transports (console provided)
- [x] Config module with file-based loaders, async options, and feature slicing helpers
- [x] MongoDB ORM module with repositories, timestamps, soft delete, and seeding support
- [x] Better Auth integration across HTTP and GraphQL, including session-aware proxy resolvers for the full Better Auth API

### Planned

- [ ] Command-line tooling for project scaffolding and code generation
- [ ] Advanced configuration presets (multi-environment secrets, validation, live reload)
- [ ] Harden Better Auth integration (integration tests, social login guides, multi-tenant support)
- [ ] Role/permission authorisation primitives layered on top of the auth module
- [ ] Dapr sidecar helpers and event-driven microservice utilities
- [ ] Additional database connectors and ODM abstractions beyond MongoDB
- [ ] Test harness utilities mirroring NestJS testing module APIs
- [ ] Comprehensive documentation site
- [ ] Unified exception-handling primitives (HTTP/GraphQL filters, logging integration, Nest-style interceptors)

## Getting Started

While the API is still in flux, you can experiment locally by cloning the repository and running the examples:

```bash
bun install
bun run build
bun run --cwd examples/basic-http start
```

Each example has its own `start` script; swap `basic-http` for any of the other example folders to explore different capabilities.

## Contributing

Because Nael Platform is in active development, we recommend opening a discussion or issue before embarking on larger contributions. Feedback on architecture, ergonomics, and missing features is especially welcome.
