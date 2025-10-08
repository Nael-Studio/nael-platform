# @nl-framework/platform

Platform adapters and bootstrap utilities that host Nael Framework modules for HTTP, GraphQL, and microservice workloads.

## Installation

```bash
bun add @nl-framework/platform
```

## Highlights

- **Unified bootstrap** – launch HTTP servers, GraphQL gateways, and microservices with a consistent API surface.
- **Testing harness** – spin up lightweight application instances for integration or contract testing.
- **Adapter interfaces** – plug in custom transports (Fastify, Express, Dapr, etc.) without changing controller logic.

## Quick start

```ts
import { NaelFactory } from '@nl-framework/platform';
import { AppModule } from './app.module';

const application = await NaelFactory.create(AppModule, {
  http: {
    port: 3000,
  },
  graphql: {
    path: '/api/graphql',
  },
});

const { http, graphql } = await application.listen({ http: 3000 });

console.log('HTTP server running on port', http?.port);
console.log('GraphQL mounted at', graphql?.url);
```

To shut everything down gracefully later on:

```ts
await application.close();
```

## API surface

- `NaelFactory.create(Module, options)` – boots the dependency graph and returns a `NaelApplication` facade.
- `NaelApplication.listen(options)` – starts HTTP, GraphQL, and federation gateway servers and returns active handles.
- `NaelApplication.getHttpApplication()` / `getGraphqlApplication()` / `getGatewayApplication()` – access the underlying adapters when you need lower-level control.
- `NaelApplication.get(token)` / `getConfig()` / `getLogger()` – resolve services from the shared application context.
- Types such as `NaelFactoryOptions`, `NaelListenOptions`, and `NaelListenResults` document the available configuration hooks.

## Compatibility

| Runtime | Minimum version | Notes |
|---------|-----------------|-------|
| Bun     | 1.1.22          | Primary runtime. CI, CLI scaffolding, and docs target Bun 1.1.22+. |
| Node.js | 20 (experimental) | HTTP adapters run on Node, but Bun remains the recommended build/test environment. |

## License

Apache-2.0
