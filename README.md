# Nael Platform

Nael Platform is a [NestJS](https://nestjs.com/)-inspired application framework built on top of [Bun](https://bun.sh). It exists because we love Nest's developer ergonomics but grew frustrated with how heavy the experience can feel in modern tooling stacks: long boot times, CommonJS-centric builds that complicate native ESM adoption, and slow feedback loops when pairing with newer libraries that expect pure ESM runtimes. By embracing Bun end-to-end—TypeScript transpilation, test running, package management, and production serving—we get dramatically faster startup, tighter iteration loops, and first-class ESM compatibility while keeping the modular architecture, decorators, and structured tooling that make Nest approachable. The project is actively under development and the API surface is expected to evolve.

## Table of Contents

- [Current Capabilities](#current-capabilities)
- [Roadmap](#roadmap)
- [Module Documentation](#module-documentation)
  - [Core Module](#core-module-nl-frameworkcore)
  - [HTTP Module](#http-module-nl-frameworkhttp)
  - [GraphQL Module](#graphql-module-nl-frameworkgraphql)
  - [Platform Module](#platform-module-nl-frameworkplatform)
  - [Config Module](#config-module-nl-frameworkconfig)
  - [Logger Module](#logger-module-nl-frameworklogger)
  - [ORM Module](#orm-module-nl-frameworkorm)
  - [Auth Module](#auth-module-nl-frameworkauth)
  - [Microservices Module](#microservices-architecture)
- [Getting Started](#getting-started)
- [Releasing to npm](#releasing-to-npm)
- [Contributing](#contributing)

## Current Capabilities

- Modular core built around dependency injection and application contexts
- HTTP module with decorator-driven routing and middleware support
- GraphQL module with schema-first resolvers and federation-ready tooling
- Federation gateway wrapper that embeds Apollo Gateway into the shared server
- Structured logging with pluggable transports (console out-of-the-box)
- Driver-based ORM module with TypeORM-style registration, MongoDB support, timestamps, and seeding hooks
- Better Auth integration with shared session handling across REST and GraphQL (including the `BetterAuthGraphqlModule`)
- Config module with layered YAML loading, async factories, and feature-scoped injection helpers
- **Microservices module with NestJS-style message patterns, Dapr integration, and event-driven pub/sub messaging**

Explore the `examples/` folder for runnable samples that demonstrate the current functionality:

- `examples/basic-http` – minimal REST-style greeting controller
- `examples/auth-http` – HTTP API with authentication flows, ORM-backed user persistence, and role-protected routes via `@nl-framework/auth`
- `examples/auth-graphql` – unified REST + GraphQL auth example exposing the Better Auth APIs through GraphQL resolvers
- `examples/basic-graphql` – standalone GraphQL server with resolver discovery
- `examples/federated-graphql` – subgraph service suitable for Apollo Federation
- `examples/federation-gateway` – single-port HTTP + GraphQL gateway using NaelFactory
- `examples/mongo-orm` – REST API backed by the Mongo ORM with seeding and soft deletes
- **`examples/microservices` – event-driven microservice with Dapr pub/sub, message pattern handlers, and deployment guides**

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
- [x] **Microservices module with NestJS-inspired message patterns (@MessagePattern, @EventPattern), Dapr transport integration, and MicroserviceClient for pub/sub messaging**

### Planned

- [ ] Command-line tooling for project scaffolding and code generation
- [ ] Advanced configuration presets (multi-environment secrets, validation, live reload)
- [ ] Harden Better Auth integration (integration tests, social login guides, multi-tenant support)
- [ ] Role/permission authorisation primitives layered on top of the auth module
- [ ] Request/response pattern implementation for microservices (send() method with Dapr service invocation)
- [ ] Automatic subscription endpoint registration for Dapr pub/sub event delivery
- [ ] Additional microservice transports (NATS, RabbitMQ, Kafka) beyond Dapr
- [ ] Additional database connectors and ODM abstractions beyond MongoDB
- [ ] Test harness utilities mirroring NestJS testing module APIs
- [ ] Comprehensive documentation site
- [ ] Unified exception-handling primitives (HTTP/GraphQL filters, logging integration, Nest-style interceptors)

---

## Module Documentation

Nael Platform is built around a modular architecture where each package provides focused functionality while integrating seamlessly through dependency injection. Below is comprehensive documentation for each module.

### Core Module (`@nl-framework/core`)

The foundation of the framework, providing dependency injection, module system, and application bootstrapping.

**Key Features:**
- **Dependency Injection**: Constructor-based injection with token resolution
- **Module System**: `@Module()` decorator for organizing providers, controllers, and imports
- **Decorators**: `@Injectable()`, `@Controller()` for marking classes
- **Application Context**: Centralized access to resolved instances and configuration

**Basic Usage:**

```typescript
import { Module, Injectable, Application } from '@nl-framework/core';

@Injectable()
export class UserService {
  getUser(id: string) {
    return { id, name: 'John Doe' };
  }
}

@Module({
  providers: [UserService],
})
export class AppModule {}

// Bootstrap the application
const app = new Application();
const context = await app.bootstrap(AppModule);
```

**Advanced Features:**
- Factory providers with `useFactory` and async initialization
- Value providers with `useValue` for constants
- Class providers with `useClass` for substitution
- Module imports and exports for sharing providers
- Lifecycle hooks: `onModuleInit()`, `onModuleDestroy()`

---

### HTTP Module (`@nl-framework/http`)

REST API development with decorator-based routing, middleware support, and guard-based authorization.

**Key Features:**
- **Route Decorators**: `@Get()`, `@Post()`, `@Put()`, `@Delete()`, `@Patch()`
- **Parameter Decorators**: `@Body()`, `@Query()`, `@Param()`, `@Headers()`, `@Req()`, `@Res()`
- **Guards**: Route protection with `@UseGuards()` for authentication/authorization
- **Middleware**: Request/response pipeline customization
- **Bun Native**: Uses Bun's native HTTP server for maximum performance

**Example:**

```typescript
import { Controller, Get, Post, Body, Param, UseGuards } from '@nl-framework/http';
import { Injectable } from '@nl-framework/core';

@Injectable()
export class AuthGuard {
  canActivate(req: Request): boolean {
    return req.headers.get('authorization') !== null;
  }
}

@Controller('/users')
export class UsersController {
  @Get('/')
  async listUsers() {
    return { users: [] };
  }

  @Get('/:id')
  async getUser(@Param('id') id: string) {
    return { id, name: 'John Doe' };
  }

  @Post('/')
  @UseGuards(AuthGuard)
  async createUser(@Body() data: { name: string; email: string }) {
    return { id: '123', ...data };
  }
}

@Module({
  controllers: [UsersController],
  providers: [AuthGuard],
})
export class AppModule {}
```

**Route Patterns:**
- Path parameters: `/users/:id`
- Query strings: Automatic parsing via `@Query()`
- Request body: JSON parsing via `@Body()`
- Custom routes: `@Route()` for non-standard HTTP methods

---

### GraphQL Module (`@nl-framework/graphql`)

Schema-first GraphQL development with resolver discovery, Apollo Server integration, and federation support.

**Key Features:**
- **Schema-First**: Load `.graphql` files and map to resolvers
- **Resolver Discovery**: Automatic registration via `@Resolver()` decorator
- **Apollo Server**: Built on Apollo Server for GraphQL spec compliance
- **Federation Ready**: First-class support for Apollo Federation subgraphs
- **Guard Integration**: Reuse HTTP guards in GraphQL resolvers
- **Context Sharing**: Access request context, user info, and DI container

**Example:**

```typescript
import { Resolver } from '@nl-framework/graphql';
import { Injectable } from '@nl-framework/core';

// schema.graphql
// type Query {
//   users: [User!]!
//   user(id: ID!): User
// }
// type User {
//   id: ID!
//   name: String!
//   email: String!
// }

@Resolver()
export class UsersResolver {
  Query = {
    users: async () => {
      return [{ id: '1', name: 'John', email: 'john@example.com' }];
    },
    user: async (_parent: any, args: { id: string }) => {
      return { id: args.id, name: 'John', email: 'john@example.com' };
    },
  };

  User = {
    // Field resolvers
    fullName: (parent: { name: string }) => {
      return parent.name.toUpperCase();
    },
  };
}

@Module({
  resolvers: [UsersResolver],
})
export class AppModule {}
```

**Federation Support:**

```typescript
import { GraphqlModule } from '@nl-framework/graphql';

@Module({
  imports: [
    GraphqlModule.forRoot({
      schemaPath: './schema.graphql',
      federation: true,
    }),
  ],
})
export class SubgraphModule {}
```

---

### Platform Module (`@nl-framework/platform`)

Unified factory for running HTTP and GraphQL servers together on a single port, with built-in Apollo Federation gateway support.

**Key Features:**
- **NaelFactory**: Single entry point for creating integrated applications
- **Shared Context**: HTTP and GraphQL share the same DI container
- **Federation Gateway**: Built-in Apollo Gateway for subgraph aggregation
- **Flexible Deployment**: Run as monolith or separate services

**Example:**

```typescript
import { NaelFactory } from '@nl-framework/platform';

@Module({
  imports: [
    HttpModule.forRoot(),
    GraphqlModule.forRoot({ schemaPath: './schema.graphql' }),
  ],
  controllers: [UsersController],
  resolvers: [UsersResolver],
})
export class AppModule {}

// Create unified application
const factory = await NaelFactory.create(AppModule);

// Access both HTTP and GraphQL applications
const httpApp = factory.getHttpApplication();
const graphqlApp = factory.getGraphqlApplication();

// Start on single port
await httpApp.start({ port: 3000 });
```

**Federation Gateway:**

```typescript
import { NaelFactory } from '@nl-framework/platform';

const factory = await NaelFactory.createGateway(AppModule, {
  gateway: {
    supergraphSdl: './supergraph.graphql',
    // or serviceList for dynamic composition
  },
});

const gatewayApp = factory.getGatewayApplication();
await gatewayApp.start({ port: 4000 });
```

---

### Config Module (`@nl-framework/config`)

Environment-aware configuration loading with YAML support, async factories, and feature-scoped injection.

**Key Features:**
- **File Loading**: YAML, JSON, and environment variable support
- **Layered Configuration**: Merge base + environment-specific configs
- **Type-Safe**: Generic-typed `ConfigService<T>` for autocomplete
- **Async Factories**: Load config from external sources (databases, vaults)
- **Feature Slicing**: Register and inject config subsets

**Basic Usage:**

```typescript
import { ConfigModule, ConfigService } from '@nl-framework/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      dir: './config',
      env: 'development', // Loads config/base.yaml + config/development.yaml
    }),
  ],
})
export class AppModule {}

@Injectable()
export class DatabaseService {
  constructor(private config: ConfigService) {}

  connect() {
    const dbConfig = this.config.get('database');
    console.log('Connecting to:', dbConfig.host);
  }
}
```

**Async Configuration:**

```typescript
ConfigModule.forRootAsync({
  useFactory: async () => {
    const secrets = await fetchFromVault();
    return {
      dir: './config',
      overrides: { apiKey: secrets.apiKey },
    };
  },
});
```

**Feature Configuration:**

```typescript
// Register feature config
ConfigModule.forFeature({
  path: 'database',
  token: 'DATABASE_CONFIG',
});

// Inject feature config
@Injectable()
export class DatabaseService {
  constructor(@Inject('DATABASE_CONFIG') private dbConfig: DatabaseConfig) {}
}
```

---

### Logger Module (`@nl-framework/logger`)

Structured logging with context tracking, multiple transports, and child logger support.

**Key Features:**
- **Structured Logging**: JSON-formatted logs with metadata
- **Context Tracking**: Module/service-level context in every log
- **Child Loggers**: Inherit context and create scoped loggers
- **Multiple Transports**: Console (built-in), extensible for custom outputs
- **Log Levels**: DEBUG, INFO, WARN, ERROR with filtering

**Usage:**

```typescript
import { Logger, LoggerFactory } from '@nl-framework/logger';

@Injectable()
export class UserService {
  private logger: Logger;

  constructor(loggerFactory: LoggerFactory) {
    this.logger = loggerFactory.create({ context: 'UserService' });
  }

  async createUser(data: any) {
    this.logger.info('Creating user', { email: data.email });
    
    try {
      // ... create user
      this.logger.info('User created successfully', { userId: '123' });
    } catch (error) {
      this.logger.error('Failed to create user', { error: error.message });
      throw error;
    }
  }
}
```

**Global Configuration:**

```typescript
const app = new Application();
const context = await app.bootstrap(AppModule, {
  logger: {
    level: 'info',
    pretty: true, // Pretty-print for development
  },
});
```

---

### ORM Module (`@nl-framework/orm`)

MongoDB integration with repository pattern, TypeORM-style registration, and built-in timestamp/soft-delete support.

**Key Features:**
- **Repository Pattern**: Type-safe CRUD operations
- **Entity Decorators**: `@Entity()`, `@Field()` for schema definition
- **Automatic Timestamps**: `createdAt`, `updatedAt` tracking
- **Soft Deletes**: `@SoftDelete()` for logical deletion
- **Seeding**: Database initialization with `@Seeder()` decorator
- **Module Registration**: Dynamic module pattern for connection config

**Example:**

```typescript
import { Entity, Field, Repository } from '@nl-framework/orm';
import { Injectable } from '@nl-framework/core';
import { ObjectId } from 'mongodb';

@Entity('users')
export class User {
  @Field()
  _id?: ObjectId;

  @Field()
  name!: string;

  @Field()
  email!: string;

  @Field()
  createdAt?: Date;

  @Field()
  updatedAt?: Date;

  @Field()
  deletedAt?: Date;
}

@Injectable()
export class UserService {
  constructor(private userRepo: Repository<User>) {}

  async createUser(name: string, email: string) {
    return this.userRepo.create({ name, email });
  }

  async findAll() {
    return this.userRepo.findAll();
  }

  async findById(id: string) {
    return this.userRepo.findById(new ObjectId(id));
  }

  async softDelete(id: string) {
    return this.userRepo.softDelete(new ObjectId(id));
  }
}

@Module({
  imports: [
    OrmModule.forRoot({
      uri: 'mongodb://localhost:27017',
      database: 'myapp',
    }),
    OrmModule.forFeature([User]),
  ],
  providers: [UserService],
})
export class AppModule {}
```

**Seeding:**

```typescript
import { Seeder } from '@nl-framework/orm';

@Seeder()
export class UserSeeder {
  constructor(private userRepo: Repository<User>) {}

  async seed() {
    await this.userRepo.create({
      name: 'Admin',
      email: 'admin@example.com',
    });
  }
}
```

---

### Auth Module (`@nl-framework/auth`)

Better Auth integration with session management, guards, and unified authentication across HTTP and GraphQL.

**Key Features:**
- **Better Auth Integration**: Full wrapper around Better Auth library
- **Session Management**: Cookie-based sessions with secure defaults
- **HTTP Guards**: `@Public()` decorator and automatic route protection
- **GraphQL Support**: Session-aware resolvers and Better Auth API proxy
- **OAuth Support**: Social login providers (Google, GitHub, etc.)
- **Email/Password**: Built-in credential authentication

**HTTP Setup:**

```typescript
import { BetterAuthModule } from '@nl-framework/auth';

@Module({
  imports: [
    BetterAuthModule.forRoot({
      database: {
        type: 'mongodb',
        uri: process.env.DATABASE_URL,
      },
      emailAndPassword: {
        enabled: true,
      },
      socialProviders: {
        google: {
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        },
      },
    }),
  ],
})
export class AppModule {}
```

**Protected Routes:**

```typescript
import { Controller, Get, UseGuards } from '@nl-framework/http';
import { BetterAuthGuard, Public, Session } from '@nl-framework/auth';

@Controller('/api')
@UseGuards(BetterAuthGuard)
export class ApiController {
  @Get('/protected')
  async protectedRoute(@Session() session: any) {
    return { message: 'Authenticated', user: session.user };
  }

  @Public()
  @Get('/public')
  async publicRoute() {
    return { message: 'Public access' };
  }
}
```

**GraphQL Integration:**

```typescript
import { BetterAuthGraphqlModule } from '@nl-framework/auth';

@Module({
  imports: [
    BetterAuthModule.forRoot({ /* config */ }),
    BetterAuthGraphqlModule.forRoot(),
  ],
})
export class AppModule {}

// Access Better Auth API in GraphQL
// query { betterAuth { session { user { id name email } } } }
// mutation { betterAuth { signIn(input: {email: "...", password: "..."}) { success } } }
```

---

## Microservices Architecture

Nael Platform includes a comprehensive microservices module (`@nl-framework/microservices`) that brings NestJS-style message patterns to Bun with first-class Dapr integration. The architecture supports event-driven communication patterns while maintaining the same decorator-based developer experience as the HTTP and GraphQL modules.

### Key Features

- **Message Pattern Decorators**: Use `@MessagePattern()` and `@EventPattern()` to define handlers for specific message types
- **MicroserviceClient**: Inject a client to emit events (`emit()`) or send request/response messages (`send()`)
- **Dapr Transport**: Built-in integration with Dapr sidecar for pub/sub messaging via HTTP API
- **Pluggable Transports**: Transport interface allows custom implementations (NATS, RabbitMQ, Kafka, etc.)
- **Automatic Handler Discovery**: Controllers are automatically scanned for message handlers during module initialization
- **DI Integration**: Full dependency injection support for services, loggers, and other providers

### Quick Example

```typescript
import { Injectable } from '@nl-framework/core';
import { MessagePattern, EventPattern, MicroserviceClient } from '@nl-framework/microservices';

@Injectable()
export class OrdersController {
  @MessagePattern('order.create')
  async createOrder(data: { customerId: string; items: any[] }) {
    // Handle order creation
    return { orderId: '123', status: 'created' };
  }

  @EventPattern('order.status.updated')
  async handleStatusUpdate(data: { orderId: string; status: string }) {
    // React to status change events
    console.log(`Order ${data.orderId} status: ${data.status}`);
  }
}

@Injectable()
export class OrdersService {
  constructor(private readonly client: MicroserviceClient) {}

  async publishOrderEvent(orderId: string) {
    await this.client.emit('order.status.updated', {
      orderId,
      status: 'processing',
    });
  }
}
```

### Module Registration

```typescript
import { Module } from '@nl-framework/core';
import { createMicroservicesModule } from '@nl-framework/microservices';
import { OrdersController } from './orders.controller';

@Module({
  imports: [
    createMicroservicesModule({
      controllers: [OrdersController],
    }),
  ],
})
export class AppModule {}
```

### Dapr Integration

The Dapr transport connects to your local Dapr sidecar (default: `localhost:3500`) and publishes events to configured pub/sub components. See the [microservices example](./examples/microservices/) for complete setup instructions including:

- Installing and initializing Dapr CLI
- Configuring Redis pub/sub components
- Running services with Dapr sidecars
- Deploying to Kubernetes with Dapr-enabled pods
- Docker Compose setup for local development

For detailed documentation, architecture diagrams, and deployment guides, refer to [`examples/microservices/README.md`](./examples/microservices/README.md).

## Getting Started

While the API is still in flux, you can experiment locally by cloning the repository and running the examples:

```bash
bun install
bun run build
bun run --cwd examples/basic-http start
```

Each example has its own `start` script; swap `basic-http` for any of the other example folders to explore different capabilities.

### Running the Microservices Example

The microservices example requires Dapr to be installed and initialized:

```bash
# Install Dapr CLI (macOS)
brew install dapr/tap/dapr-cli

# Initialize Dapr
dapr init

# Run the microservices example with Dapr sidecar
cd examples/microservices
bun run dapr
```

See [`examples/microservices/README.md`](./examples/microservices/README.md) for complete setup instructions and deployment guides.

---

## Package Overview

Quick reference for all framework packages:

| Package | Description | Key Features |
|---------|-------------|--------------|
| `@nl-framework/core` | DI container and module system | Dependency injection, lifecycle hooks, application context |
| `@nl-framework/http` | REST API framework | Decorator routing, guards, middleware, Bun-native server |
| `@nl-framework/graphql` | GraphQL server | Schema-first, Apollo Server, federation, resolver discovery |
| `@nl-framework/platform` | Unified application factory | Combined HTTP+GraphQL, gateway support, shared context |
| `@nl-framework/config` | Configuration management | YAML/JSON loading, environment merging, async factories |
| `@nl-framework/logger` | Structured logging | Context tracking, child loggers, multiple transports |
| `@nl-framework/orm` | MongoDB ORM | Repository pattern, timestamps, soft deletes, seeding |
| `@nl-framework/auth` | Authentication | Better Auth integration, session management, OAuth |
| `@nl-framework/microservices` | Event-driven messaging | Message patterns, Dapr transport, pub/sub support |

## Architecture Principles

Nael Platform follows these core architectural principles:

1. **Modularity First**: Every feature is a self-contained module that can be imported independently
2. **Decorator-Driven**: Familiar NestJS-style decorators for routing, DI, and metadata
3. **Type Safety**: Full TypeScript support with generics and type inference
4. **Performance**: Bun-native implementations for maximum speed
5. **Developer Experience**: Fast feedback loops, clear error messages, minimal boilerplate
6. **Production Ready**: Structured logging, configuration management, and lifecycle hooks
7. **Extensibility**: Plugin architecture for custom transports, guards, and middleware

## Releasing to npm

Workspace packages are published automatically when you push a semantic version tag (for example `0.1.0`) to GitHub. The workflow treats that tag as the release version for every first-party package:

- `@nl-framework/auth`
- `@nl-framework/config`
- `@nl-framework/core`
- `@nl-framework/graphql`
- `@nl-framework/http`
- `@nl-framework/logger`
- `@nl-framework/microservices`
- `@nl-framework/orm`
- `@nl-framework/platform`

When the tag lands:

1. Dependencies are installed with Bun and the full workspace build (`bun run scripts/build-all.ts`) runs to emit fresh `dist/` artifacts for each package.
2. The workflow verifies that the `version` in every `packages/<slug>/package.json` equals the tag value.
3. Each package is published to npm with `npm publish --access public`. If a package already exposes that version on npm, the step is skipped and the release continues.

### Release checklist

1. Update the `version` field in each package that should be part of the release (all nine packages normally share the same version).
2. Commit the changes so the new versions are on the branch you want to release.
3. Create and push the tag:

  ```bash
  git tag 0.2.0
  git push origin 0.2.0
  ```

  The tag value must match the `MAJOR.MINOR.PATCH` format; the workflow will fail fast if it does not.

### Required Secrets

- `NPM_TOKEN` – Scoped publish token for the `npmjs.com` registry with access to the `@nl-framework/*` packages.

Add the secret to the repository (or organization) settings before pushing tags; runs without the token will fail at the publish step.

## Contributing

Because Nael Platform is in active development, we recommend opening a discussion or issue before embarking on larger contributions. Feedback on architecture, ergonomics, and missing features is especially welcome.
