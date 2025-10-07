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
import { bootstrapHttpApplication } from '@nl-framework/platform';
import { AppModule } from './app.module';

const app = await bootstrapHttpApplication(AppModule, {
  port: 3000,
  logger: true,
});

await app.start();
console.log('HTTP server ready');
```

Need GraphQL too? Use the factory helper:

```ts
import { NaelFactory } from '@nl-framework/platform';

const factory = await NaelFactory.create(AppModule, {
  graphql: {
    path: '/api/graphql',
  },
});

const { graphql } = await factory.listen();
console.log('GraphQL server running at', graphql?.url);
```

## License

Apache-2.0
