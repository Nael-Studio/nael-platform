# @nl-framework/platform

Platform adapters and bootstrap utilities that host NL Framework Framework modules for HTTP, GraphQL, and microservice workloads.

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
import { NLFactory } from '@nl-framework/platform';
import { AppModule } from './app.module';

const application = await NLFactory.create(AppModule, {
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

- `NLFactory.create(Module, options)` – boots the dependency graph and returns a `NL FrameworkApplication` facade.
- `NL FrameworkApplication.listen(options)` – starts HTTP, GraphQL, and federation gateway servers and returns active handles.
- `NL FrameworkApplication.getHttpApplication()` / `getGraphqlApplication()` / `getGatewayApplication()` – access the underlying adapters when you need lower-level control.
- `NL FrameworkApplication.get(token)` / `getConfig()` / `getLogger()` – resolve services from the shared application context.
- Types such as `NLFactoryOptions`, `NL FrameworkListenOptions`, and `NL FrameworkListenResults` document the available configuration hooks.

## Compatibility

| Runtime | Minimum version | Notes |
|---------|-----------------|-------|
| Bun     | 1.1.22          | Primary runtime. CI, CLI scaffolding, and docs target Bun 1.1.22+. |
| Node.js | 20 (experimental) | HTTP adapters run on Node, but Bun remains the recommended build/test environment. |

## License

Apache-2.0
