# Nael Platform

Nael Platform is a [NestJS](https://nestjs.com/)-inspired application framework built on top of [Bun](https://bun.sh). It aims to bring Nest-style modular architecture, decorators, and structured tooling to Bun while remaining lightweight and fast. The project is actively under development and the API surface is expected to evolve.

## Current Capabilities

- Modular core built around dependency injection and application contexts
- HTTP module with decorator-driven routing and middleware support
- GraphQL module with schema-first resolvers and federation-ready tooling
- Federation gateway wrapper that embeds Apollo Gateway into the shared server
- Structured logging with pluggable transports (console out-of-the-box)

Explore the `examples/` folder for runnable samples that demonstrate the current functionality:

- `examples/basic-http` – minimal REST-style greeting controller
- `examples/basic-graphql` – standalone GraphQL server with resolver discovery
- `examples/federated-graphql` – subgraph service suitable for Apollo Federation
- `examples/federation-gateway` – single-port HTTP + GraphQL gateway using NaelFactory

## Roadmap

The roadmap tracks both the pieces that already landed and the ones we still plan to ship ahead of the first stable release.

### Completed

- [x] Modular application core with dependency injection and scoped contexts
- [x] HTTP module with decorator-driven routing, middleware, and Bun-native server
- [x] GraphQL module with schema-first resolver discovery and federation hooks
- [x] NaelFactory-powered Apollo Federation gateway running alongside HTTP routes
- [x] Structured logger with pluggable transports (console provided)

### Planned

- [ ] Command-line tooling for project scaffolding and code generation
- [ ] Production-ready configuration presets and environment management
- [ ] Pluggable authentication & authorization module integrations
- [ ] Dapr sidecar helpers and event-driven microservice utilities
- [ ] MongoDB (and additional database) ODM abstractions
- [ ] Test harness utilities mirroring NestJS testing module APIs
- [ ] Comprehensive documentation site

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
