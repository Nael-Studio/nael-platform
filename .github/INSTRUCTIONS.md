# nl-framework GitHub Instructions

These guidelines keep our work consistent across issues, pull requests, and automation. Follow them before opening contributions or triggering new tasks.

## Project vision
- Build a NestJS-inspired framework optimized for Bun.
- Provide first-class support for microservices via Dapr with Redis defaults, Apollo Federation, Better Auth, and a MongoDB-based ORM.
- Deliver a structured logging package (`@nl-framework/logger`) patterned after `@nestjs/logger` and wire it into every runtime surface.
- Ship each package as an npm-ready workspace within a single monorepo.

## Repository layout
```
packages/
  core/              # Dependency injection, modules, lifecycle
  config/            # YAML loader, env overrides, validation
  logger/            # Structured logger + adapters (console, Bun, external sinks)
  http/              # Bun server adapter, routing, middleware
  graphql/           # Apollo Federation subgraph utilities
  microservices/     # Dapr integrations, pub/sub abstractions
  gateway/           # Apollo Gateway bootstrapper
  auth/              # Better Auth integration helpers
  orm/               # MongoDB ODM with audit + soft delete
  cli/               # (Optional) codegen, scaffolding utilities
examples/
  services/*         # Sample REST + GraphQL microservices
  gateway/           # Gateway example wiring federated subgraphs
  workers/*          # Background processors using Redis streams
config/              # YAML environment configs
scripts/             # Build/test/publish helpers
```

## Contribution workflow
1. **Plan first**
   - Capture requirements in the shared TODO tracker (GitHub issues, project board, or automation).
   - Each task should include acceptance criteria and cross-reference the relevant packages.
   - The logger package is the first deliverable for any new milestone—confirm `@nl-framework/logger` capabilities up front before expanding other surfaces.
   - Cross-check the root roadmap in `README.md` so ongoing work reflects completed Better Auth + config milestones and focuses on the remaining targets.
2. **Scaffold consistently**
   - Use Bun workspaces for every new package and keep TypeScript configs aligned with `tsconfig.base.json`.
   - Favor Bun-native APIs in runtime code (`Bun.serve`, `Bun.file`, `Bun.hash`, etc.) and avoid Node.js-only polyfills or compatibility layers. Vet new dependencies for Bun support before adoption.
   - Expose ESM builds with declaration files and mark publishable packages with `"publishConfig"`.
   - Route all console or telemetry output through the shared logger; never instantiate ad-hoc loggers inside feature packages.
   - Resolve the logger from the DI container (`LoggerFactory` → `.create()`) inside runtime surfaces and examples; avoid importing `console` in framework-managed code paths.
   - When bootstrapping samples, register request logging middleware using the shared logger and log lifecycle events (`listen`, `close`, error handlers) through it.
3. **Configuration & secrets**
   - Store defaults in YAML under `config/` with environment overrides like `development.yaml`, `production.yaml` or `env.yaml` per service.
   - Use `config/env.example.yaml` as the template for environment-specific values and never commit real secrets.
4. **Microservices & messaging**
   - Default pub/sub is Redis via Dapr components; additional brokers must be pluggable through Dapr configuration files placed in `dapr/components/`.
   - Document any new bindings or subscriptions in the service README.
5. **GraphQL federation**
   - Each service publishes a federated subgraph using the `@nl-framework/graphql` package.
   - Update the gateway service configuration when adding or removing subgraphs.
6. **Auth integration**
   - Use the Better Auth wrapper module (REST + `BetterAuthGraphqlModule`) for authentication/authorization.
   - Place reusable guards, decorators, and policies in the `auth` package.
   - When exposing auth flows over GraphQL, rely on the shared proxy helpers instead of duplicating HTTP logic.
7. **MongoDB ORM**
   - Entities must extend the base auditable model to inherit `createdAt`, `updatedAt`, and soft delete (`deletedAt`).
   - Provide migration or seed scripts when introducing new collections.
8. **Testing & quality gates**
   - Implement unit tests with `bun test` / `vitest` and ensure integration tests cover microservice flows.
   - Run formatters and linters (`biome` or `eslint` TBD) before submitting changes.
   - Record test/build commands in PR descriptions.
9. **Documentation**
   - Update the root README and package-level docs after any notable change.
   - Maintain changelogs if publishing to npm.
10. **Exception handling (upcoming focus)**
   - Track work toward unified HTTP/GraphQL exception filters, logging integration, and interceptor support.
   - Prefer incremental contributions that move toward the shared exception primitives listed in the roadmap.

## Pull request template
Include the following in every PR:
- Summary of changes
- Checklist of affected packages
- Tests executed (`bun test`, `bun run lint`, etc.)
- Deployment or Dapr component updates

## Release & publishing checklist
- Bump versions consistently across affected packages (use `scripts/publish.ts`).
- Ensure `package.json` contains proper metadata (`name`, `version`, `exports`, `types`).
- Run `bun build` and `bun test` for all workspaces before `npm publish`.
- Tag releases with `v<major>.<minor>.<patch>` and attach release notes summarizing new capabilities.

## Automation opportunities
- GitHub Actions for lint/test/build matrix on Bun.
- Dapr component validation workflow.
- Release orchestration using changesets or custom scripts.

---

## MCP Server Package (`@nl-framework/mcp-server`)

### Overview
The MCP (Model Context Protocol) server package exposes Nael Framework documentation, examples, and guidance to AI coding assistants. This makes the framework more discoverable and provides developers with inline help through tools like Claude Desktop, Cursor, and other MCP-compatible clients.

### Package Structure
```
packages/mcp-server/
├── src/
│   ├── index.ts                    # MCP server entry point (stdio transport)
│   ├── server.ts                   # Main server implementation with SDK integration
│   ├── tools/                      # MCP tools (functions AI can call)
│   │   ├── get-package-docs.ts     # Retrieve full package documentation
│   │   ├── search-api.ts           # Search decorators, classes, methods
│   │   ├── get-example.ts          # Get code examples by use case
│   │   ├── list-packages.ts        # List all available packages
│   │   ├── get-quick-start.ts      # Quick start guides
│   │   ├── get-decorator-info.ts   # Decorator signatures and usage
│   │   ├── get-best-practices.ts   # Framework best practices
│   │   └── troubleshoot.ts         # Common issues and solutions
│   ├── resources/                  # MCP resources (browsable docs)
│   │   └── documentation.ts        # Resource provider for nael:// URIs
│   ├── prompts/                    # Pre-built code generation prompts
│   │   ├── create-controller.ts    # HTTP controller template
│   │   ├── create-resolver.ts      # GraphQL resolver template
│   │   ├── setup-microservice.ts   # Microservice module template
│   │   └── setup-auth.ts           # Auth integration template
│   └── docs/                       # Structured documentation data
│       ├── packages/               # Per-package documentation
│       │   ├── core.ts             # @nl-framework/core docs
│       │   ├── http.ts             # @nl-framework/http docs
│       │   ├── graphql.ts          # @nl-framework/graphql docs
│       │   ├── platform.ts         # @nl-framework/platform docs
│       │   ├── config.ts           # @nl-framework/config docs
│       │   ├── logger.ts           # @nl-framework/logger docs
│       │   ├── orm.ts              # @nl-framework/orm docs
│       │   ├── auth.ts             # @nl-framework/auth docs
│       │   └── microservices.ts    # @nl-framework/microservices docs
│       ├── examples/               # Categorized code examples
│       │   ├── http-examples.ts
│       │   ├── graphql-examples.ts
│       │   ├── microservices-examples.ts
│       │   └── auth-examples.ts
│       ├── guides/                 # How-to guides
│       │   ├── getting-started.ts
│       │   ├── best-practices.ts
│       │   ├── testing.ts
│       │   └── troubleshooting.ts
│       └── api/                    # API reference
│           ├── decorators.ts       # All decorator definitions
│           ├── classes.ts          # Core classes
│           └── interfaces.ts       # Public interfaces
├── package.json
├── tsconfig.json
├── tsconfig.build.json
└── README.md
```

### MCP Tools Implementation

Each tool must be registered with the MCP SDK and include:
1. **Name**: Unique identifier for the tool
2. **Description**: Clear explanation for AI assistants
3. **Input Schema**: JSON Schema for parameters
4. **Handler**: Implementation returning structured data

#### Tool: `get-package-docs`
```typescript
{
  name: "get-package-docs",
  description: "Get comprehensive documentation for a specific Nael Framework package including features, installation, API reference, and examples",
  inputSchema: {
    type: "object",
    properties: {
      packageName: {
        type: "string",
        enum: ["core", "http", "graphql", "platform", "config", "logger", "orm", "auth", "microservices"],
        description: "Name of the package to get documentation for"
      }
    },
    required: ["packageName"]
  }
}
```

#### Tool: `search-api`
```typescript
{
  name: "search-api",
  description: "Search for decorators, classes, methods, or interfaces in Nael Framework with usage examples",
  inputSchema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Search term (e.g., '@Controller', 'Repository', 'useFactory')"
      },
      type: {
        type: "string",
        enum: ["decorator", "class", "method", "interface", "all"],
        description: "Filter by API type"
      }
    },
    required: ["query"]
  }
}
```

#### Tool: `get-example`
```typescript
{
  name: "get-example",
  description: "Get complete code examples for specific use cases with explanations",
  inputSchema: {
    type: "object",
    properties: {
      useCase: {
        type: "string",
        description: "Use case description (e.g., 'create REST API', 'setup authentication', 'MongoDB integration')"
      },
      package: {
        type: "string",
        enum: ["core", "http", "graphql", "platform", "config", "logger", "orm", "auth", "microservices"],
        description: "Optional: Filter examples by package"
      }
    },
    required: ["useCase"]
  }
}
```

#### Tool: `list-packages`
```typescript
{
  name: "list-packages",
  description: "List all available Nael Framework packages with descriptions and key features",
  inputSchema: {
    type: "object",
    properties: {}
  }
}
```

#### Tool: `get-quick-start`
```typescript
{
  name: "get-quick-start",
  description: "Get quick start guide with installation and setup steps",
  inputSchema: {
    type: "object",
    properties: {
      package: {
        type: "string",
        enum: ["framework", "core", "http", "graphql", "platform", "config", "logger", "orm", "auth", "microservices"],
        description: "Get quick start for framework or specific package"
      }
    }
  }
}
```

#### Tool: `get-decorator-info`
```typescript
{
  name: "get-decorator-info",
  description: "Get detailed information about a specific decorator including signature, parameters, and usage examples",
  inputSchema: {
    type: "object",
    properties: {
      decorator: {
        type: "string",
        description: "Decorator name (e.g., '@Controller', '@Get', '@MessagePattern', '@Resolver')"
      }
    },
    required: ["decorator"]
  }
}
```

#### Tool: `get-best-practices`
```typescript
{
  name: "get-best-practices",
  description: "Get best practices, common patterns, and anti-patterns for Nael Framework",
  inputSchema: {
    type: "object",
    properties: {
      topic: {
        type: "string",
        description: "Topic (e.g., 'error handling', 'testing', 'production deployment', 'dependency injection')"
      }
    }
  }
}
```

#### Tool: `troubleshoot`
```typescript
{
  name: "troubleshoot",
  description: "Get solutions for common issues, errors, and troubleshooting guidance",
  inputSchema: {
    type: "object",
    properties: {
      error: {
        type: "string",
        description: "Error message or issue description"
      },
      topic: {
        type: "string",
        description: "Topic area (e.g., 'dependency injection', 'routing', 'database')"
      }
    }
  }
}
```

### MCP Resources

Resources are browsable documentation accessible via URI patterns:

- `nael://docs/{package}` - Full package documentation
- `nael://examples/{category}` - Code examples by category
- `nael://guides/{guide-name}` - How-to guides
- `nael://api/{item-type}` - API reference sections

### MCP Prompts

Pre-built prompts for code generation:

#### Prompt: `create-http-controller`
```typescript
{
  name: "create-http-controller",
  description: "Generate a new HTTP controller with routes following Nael Framework best practices",
  arguments: [
    { name: "controllerName", description: "Controller class name (e.g., 'UsersController')", required: true },
    { name: "basePath", description: "Base route path (e.g., '/users')", required: true },
    { name: "routes", description: "Comma-separated routes (e.g., 'GET /, POST /, GET /:id')", required: false }
  ]
}
```

#### Prompt: `create-graphql-resolver`
```typescript
{
  name: "create-graphql-resolver",
  description: "Generate a new GraphQL resolver with queries and mutations",
  arguments: [
    { name: "resolverName", description: "Resolver class name (e.g., 'UsersResolver')", required: true },
    { name: "typeName", description: "GraphQL type name (e.g., 'User')", required: true },
    { name: "operations", description: "Comma-separated operations (e.g., 'users, user(id), createUser')", required: false }
  ]
}
```

#### Prompt: `setup-microservice`
```typescript
{
  name: "setup-microservice",
  description: "Generate a microservice module with message patterns and Dapr integration",
  arguments: [
    { name: "serviceName", description: "Service name (e.g., 'OrdersService')", required: true },
    { name: "patterns", description: "Comma-separated message patterns (e.g., 'order.create, order.update')", required: false }
  ]
}
```

#### Prompt: `setup-auth`
```typescript
{
  name: "setup-auth",
  description: "Generate authentication setup with Better Auth integration",
  arguments: [
    { name: "providers", description: "Auth providers (e.g., 'email,google,github')", required: false },
    { name: "database", description: "Database type ('mongodb' or 'postgres')", required: false }
  ]
}
```

### Documentation Data Structure

Each package documentation follows this TypeScript interface:

```typescript
interface PackageDocumentation {
  name: string;                    // Package name (e.g., "@nl-framework/http")
  version: string;                 // Current version
  description: string;             // Brief description
  installation: string;            // Installation command
  
  features: {
    title: string;
    description: string;
    icon?: string;                 // Optional emoji or icon
  }[];
  
  quickStart: {
    description: string;
    steps: string[];
    code: string;                  // Complete example
  };
  
  api: {
    decorators?: {
      name: string;                // e.g., "@Controller"
      signature: string;           // TypeScript signature
      parameters: {
        name: string;
        type: string;
        description: string;
        required: boolean;
      }[];
      description: string;
      examples: string[];
    }[];
    classes?: {
      name: string;
      description: string;
      methods: {
        name: string;
        signature: string;
        description: string;
      }[];
      examples: string[];
    }[];
    interfaces?: {
      name: string;
      description: string;
      properties: {
        name: string;
        type: string;
        description: string;
        required: boolean;
      }[];
    }[];
  };
  
  examples: {
    title: string;
    description: string;
    code: string;
    explanation?: string;
    tags?: string[];              // For categorization
  }[];
  
  bestPractices: {
    category: string;             // e.g., "Dependency Injection", "Error Handling"
    do: {
      title: string;
      description: string;
      code?: string;
    }[];
    dont: {
      title: string;
      description: string;
      code?: string;
    }[];
  }[];
  
  troubleshooting: {
    issue: string;
    symptoms: string[];
    solution: string;
    code?: string;
    relatedTopics?: string[];
  }[];
  
  relatedPackages?: string[];     // Dependencies or commonly used with
  changelog?: {
    version: string;
    changes: string[];
  }[];
}
```

### Implementation Phases

#### Phase 1: Core Infrastructure ✓ (To be implemented)
- [ ] Create `@nl-framework/mcp-server` package structure
- [ ] Install and configure `@modelcontextprotocol/sdk`
- [ ] Set up stdio transport for MCP server
- [ ] Create base documentation data structures
- [ ] Implement `list-packages` tool
- [ ] Implement `get-package-docs` tool
- [ ] Write package.json with proper bin entry
- [ ] Add to workspace and build scripts

#### Phase 2: Documentation Content ✓ (To be implemented)
- [ ] Document Core module with API reference
- [ ] Document HTTP module with routing examples
- [ ] Document GraphQL module with resolver patterns
- [ ] Document Platform module with factory usage
- [ ] Document Config module with loaders
- [ ] Document Logger module with transports
- [ ] Document ORM module with repositories
- [ ] Document Auth module with Better Auth
- [ ] Document Microservices module with Dapr
- [ ] Create 20+ comprehensive code examples
- [ ] Write getting started guides
- [ ] Document best practices per module

#### Phase 3: Advanced Tools ✓ (To be implemented)
- [ ] Implement `search-api` with fuzzy string matching
- [ ] Implement `get-example` with semantic search
- [ ] Implement `get-decorator-info` with full signatures
- [ ] Implement `get-best-practices` with categorization
- [ ] Implement `troubleshoot` with error pattern matching
- [ ] Add MCP resources for browsable documentation
- [ ] Implement resource URI handlers (nael://*)

#### Phase 4: Prompts & Templates ✓ (To be implemented)
- [ ] Create `create-http-controller` prompt
- [ ] Create `create-graphql-resolver` prompt
- [ ] Create `setup-microservice` prompt
- [ ] Create `setup-auth` prompt
- [ ] Create `setup-database` prompt
- [ ] Test with Claude Desktop configuration
- [ ] Test with Cursor IDE integration
- [ ] Write comprehensive MCP server README
- [ ] Document usage for developers

### Usage & Integration

#### Claude Desktop Configuration
Add to `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "nael-framework": {
      "command": "bunx",
      "args": ["@nl-framework/mcp-server"]
    }
  }
}
```

#### Cursor Configuration
Add to Cursor settings for workspace:
```json
{
  "mcp.servers": {
    "nael-framework": {
      "command": "bunx @nl-framework/mcp-server"
    }
  }
}
```

#### Example AI Interaction Flow
```
User: "How do I create a REST API with authentication?"

AI: [Internally calls MCP tools]
- get-package-docs(packageName: "http")
- get-package-docs(packageName: "auth")
- get-example(useCase: "REST API with authentication")

AI Response with accurate framework guidance:
"Here's how to create an authenticated REST API in Nael Framework:

1. Install packages:
   bun add @nl-framework/http @nl-framework/auth

2. [Shows controller code from MCP]
3. [Shows auth setup from MCP]
4. [Shows module configuration from MCP]
"
```

### Development Guidelines

1. **Documentation Updates**
   - Update MCP docs whenever APIs change
   - Add new examples for every major feature
   - Version documentation with framework releases

2. **Code Examples**
   - All examples must be runnable and tested
   - Include TypeScript type annotations
   - Add explanatory comments
   - Show both basic and advanced usage

3. **Tool Responses**
   - Return structured JSON data
   - Include code formatted with proper syntax
   - Provide context and explanations
   - Link to related topics

4. **Error Handling**
   - Handle missing packages gracefully
   - Suggest alternatives when exact match not found
   - Log errors for debugging (via `@nl-framework/logger`)

5. **Testing**
   - Unit test each tool handler
   - Integration tests with real MCP clients
   - Validate documentation completeness
   - Check all code examples compile

6. **Maintenance**
   - Review docs quarterly for accuracy
   - Update examples with new patterns
   - Track common questions and expand docs
   - Monitor AI assistant usage patterns

### Benefits

✅ **Developer Experience:**
- AI assistants provide accurate, framework-specific guidance
- Inline documentation while coding reduces context switching
- Natural language queries for API discovery
- Consistent code generation following best practices

✅ **Framework Adoption:**
- Lower barrier to entry for new developers
- Faster onboarding with AI-assisted learning
- Reduced support burden (docs available 24/7)
- Better discoverability of advanced features

✅ **Quality & Consistency:**
- Single source of truth for all documentation
- Type-safe documentation structure
- Version-controlled docs alongside code
- AI generates code following framework conventions

✅ **Future-Proof:**
- Works with any MCP-compatible client
- Extensible architecture for new tools
- Supports multiple AI assistants simultaneously
- Ready for emerging AI coding tools

### Future Enhancements

- [ ] Interactive tutorials via MCP prompts
- [ ] Version-specific documentation (multi-version support)
- [ ] Community examples integration
- [ ] Real-time package usage statistics from npm
- [ ] Integration with npm registry for version checks
- [ ] Visual diagram generation (architecture, flow charts)
- [ ] Migration assistant between framework versions
- [ ] Code analysis tools (suggest improvements)
- [ ] Performance optimization suggestions
- [ ] Security best practice validation

---

Keep this file up to date whenever the architecture or tooling evolves.