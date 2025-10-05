# @nl-framework/mcp-server

Model Context Protocol (MCP) server that exposes Nael Framework documentation, examples, and best practices to AI coding assistants like Claude Desktop, Cursor, and other MCP-compatible clients.

## What is This?

This package provides a **documentation server** that AI assistants can query to help developers use the Nael Framework. Instead of searching docs manually, developers can ask their AI assistant questions like:

- "How do I create a REST API with authentication in Nael Framework?"
- "Show me an example of a GraphQL resolver"
- "What's the best way to set up microservices with Dapr?"

The AI will use this MCP server to provide accurate, framework-specific guidance with runnable code examples.

## Features

- 📚 **Comprehensive Documentation**: All 9 framework packages documented
- 🔍 **Searchable API Reference**: Decorators, classes, interfaces
- 💡 **Code Examples**: 20+ runnable examples covering common use cases
- ✅ **Best Practices**: Do's and don'ts for each package
- 🔧 **Troubleshooting**: Solutions for common issues
- 🤖 **AI-Native**: Designed for AI assistant integration

## Supported Packages

- `@nl-framework/core` - Dependency injection and modules
- `@nl-framework/http` - REST API framework
- `@nl-framework/graphql` - GraphQL server
- `@nl-framework/platform` - Unified application factory
- `@nl-framework/config` - Configuration management
- `@nl-framework/logger` - Structured logging
- `@nl-framework/orm` - MongoDB ORM
- `@nl-framework/auth` - Authentication (Better Auth)
- `@nl-framework/microservices` - Event-driven messaging with Dapr

## Installation

### For Claude Desktop

1. Install the package globally:
```bash
npm install -g @nl-framework/mcp-server
# or
bunx @nl-framework/mcp-server
```

2. Add to your Claude Desktop configuration (`claude_desktop_config.json`):

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

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

3. Restart Claude Desktop

### For Cursor

Add to your Cursor settings (`.cursor/settings.json` in your workspace):

```json
{
  "mcp.servers": {
    "nael-framework": {
      "command": "bunx",
      "args": ["@nl-framework/mcp-server"]
    }
  }
}
```

### For VS Code with Continue

Add to Continue's `config.json`:

```json
{
  "experimental": {
    "modelContextProtocolServers": [
      {
        "transport": {
          "type": "stdio",
          "command": "bunx",
          "args": ["@nl-framework/mcp-server"]
        }
      }
    ]
  }
}
```

## Available Tools

The MCP server exposes these tools that AI assistants can call:

### `list-packages`
Lists all available Nael Framework packages with descriptions.

**Example:**
```
User: "What packages does Nael Framework have?"
AI: [Calls list-packages tool]
AI: "Nael Framework has 9 packages: core, http, graphql..."
```

### `get-package-docs`
Get comprehensive documentation for a specific package.

**Parameters:**
- `packageName` (required): One of: `core`, `http`, `graphql`, `platform`, `config`, `logger`, `orm`, `auth`, `microservices`

**Example:**
```
User: "How do I use the HTTP package?"
AI: [Calls get-package-docs with packageName: "http"]
AI: "Here's how to use @nl-framework/http..."
```

### `search-api`
Search for decorators, classes, methods, or interfaces across all packages.

**Parameters:**
- `query` (required): Search term (e.g., "Injectable", "Controller", "GraphQL")
- `type` (optional): Filter by type - `decorator`, `class`, `method`, `interface`, or `all` (default)
- `package` (optional): Filter by package name

**Example:**
```
User: "Find all decorators for HTTP routing"
AI: [Calls search-api with query: "HTTP routing", type: "decorator"]
AI: "Here are the HTTP routing decorators: @Get, @Post, @Put, @Delete..."
```

### `get-example`
Get complete code examples for specific use cases with explanations.

**Parameters:**
- `useCase` (required): Use case description (e.g., "create REST API", "setup authentication")
- `package` (optional): Filter examples by package

**Example:**
```
User: "Show me an example of creating a GraphQL resolver"
AI: [Calls get-example with useCase: "GraphQL resolver"]
AI: "Here's a complete example of a GraphQL resolver in Nael Framework..."
```

### `get-decorator-info`
Get detailed information about a specific decorator including signature, parameters, and usage.

**Parameters:**
- `decorator` (required): Decorator name (e.g., "@Controller", "@Injectable", "@Get")
- `package` (optional): Filter by package

**Example:**
```
User: "What parameters does @Injectable accept?"
AI: [Calls get-decorator-info with decorator: "@Injectable"]
AI: "The @Injectable decorator accepts these parameters..."
```

### `get-best-practices`
Get best practices and patterns for a specific topic or package.

**Parameters:**
- `topic` (required): Topic or concern (e.g., "testing", "error handling", "performance")
- `package` (optional): Filter by package

**Example:**
```
User: "What are the best practices for error handling?"
AI: [Calls get-best-practices with topic: "error handling"]
AI: "Here are error handling best practices for Nael Framework..."
```

### `troubleshoot`
Find solutions to common issues and error messages.

**Parameters:**
- `issue` (required): Error message, symptom, or problem description
- `package` (optional): Filter by package where the issue occurs

**Example:**
```
User: "I'm getting a 'dependency not found' error"
AI: [Calls troubleshoot with issue: "dependency not found"]
AI: "This error typically occurs when... Here's how to fix it..."
```

## Available Prompts

The MCP server provides interactive step-by-step guides through prompts:

### `create-http-controller`
Guides you through creating a REST API controller with all necessary components.

**Parameters:**
- `controllerName` (required): Name of the controller (e.g., "User", "Product")
- `endpoints` (optional): Comma-separated endpoints (e.g., "GET /users, POST /users")
- `withAuth` (optional): Include authentication (true/false)

**Example:**
```
User: "Help me create a Product REST API with authentication"
AI: [Uses create-http-controller prompt]
AI: [Provides step-by-step guide with complete code examples]
```

### `create-graphql-resolver`
Guides you through creating a GraphQL resolver with queries, mutations, and subscriptions.

**Parameters:**
- `typeName` (required): Name of the GraphQL type (e.g., "User", "Product")
- `fields` (optional): Comma-separated fields (e.g., "id:ID, name:String, price:Float")
- `withSubscriptions` (optional): Include subscriptions (true/false)

**Example:**
```
User: "Help me create a Product GraphQL API with real-time updates"
AI: [Uses create-graphql-resolver prompt with withSubscriptions: true]
AI: [Provides complete resolver implementation with subscriptions]
```

### `setup-microservice`
Guides you through setting up an event-driven microservice with Dapr.

**Parameters:**
- `serviceName` (required): Name of the microservice (e.g., "orders", "payments")
- `pubsubTopics` (optional): Comma-separated topics (e.g., "order.created, order.completed")
- `withStateStore` (optional): Include state store integration (true/false)

**Example:**
```
User: "Help me set up an orders microservice with state management"
AI: [Uses setup-microservice prompt]
AI: [Provides Dapr configuration, event handlers, and deployment guide]
```

### `setup-auth`
Guides you through setting up authentication with Better Auth.

**Parameters:**
- `providers` (optional): Comma-separated providers (e.g., "email, google, github")
- `withRBAC` (optional): Include role-based access control (true/false)
- `database` (optional): Database type (mongodb, postgresql, mysql, sqlite)

**Example:**
```
User: "Help me add authentication with Google OAuth and role-based permissions"
AI: [Uses setup-auth prompt with providers: "email,google", withRBAC: true]
AI: [Provides complete auth setup with OAuth and RBAC]
```

## Available Resources

The MCP server exposes browsable documentation through URI resources:

### Package Documentation
Access complete package documentation via URIs:
- `nael://docs/core` - Core package documentation
- `nael://docs/http` - HTTP package documentation  
- `nael://docs/graphql` - GraphQL package documentation
- `nael://docs/platform` - Platform package documentation
- `nael://docs/config` - Config package documentation
- `nael://docs/logger` - Logger package documentation
- `nael://docs/orm` - ORM package documentation
- `nael://docs/auth` - Auth package documentation
- `nael://docs/microservices` - Microservices package documentation

### Example Categories
Browse examples by category:
- `nael://examples/crud` - CRUD operation examples
- `nael://examples/authentication` - Auth examples
- `nael://examples/graphql` - GraphQL examples
- `nael://examples/microservices` - Microservice examples

### Guides
Access comprehensive guides:
- `nael://guides/getting-started` - Getting started guide
- `nael://guides/best-practices` - Best practices guide
- `nael://guides/troubleshooting` - Troubleshooting guide

**Example Usage:**
```
AI: [Reads resource nael://docs/http]
AI: "Here's the complete HTTP package documentation..."

AI: [Reads resource nael://examples/crud]
AI: "Here are all CRUD examples from the framework..."

AI: [Reads resource nael://guides/getting-started]
AI: [Provides step-by-step getting started guide]
```

## Usage Examples

### With Claude Desktop

Once configured, you can ask Claude questions about Nael Framework:

```
You: "How do I create a REST API with Nael Framework?"

Claude: [Uses MCP to fetch docs]
"I'll help you create a REST API using Nael Framework. Here's how:

1. Install the packages:
   bun add @nl-framework/core @nl-framework/http

2. Create a controller:
   [Shows actual code from the MCP server]

3. Create a module:
   [Shows module setup]
   
Would you like me to explain any specific part?"
```

### With Cursor

```
You: Show me best practices for dependency injection in Nael Framework

Cursor: [Queries MCP server for best practices]
[Shows formatted best practices with do's and don'ts]
```

## Development

### Running Locally

```bash
# Install dependencies
bun install

# Run in development mode
bun run dev

# Build
bun run build

# Test (when tests are added)
bun test
```

### Project Structure

```
packages/mcp-server/
├── src/
│   ├── index.ts                    # Entry point
│   ├── server.ts                   # MCP server implementation
│   ├── types.ts                    # Type definitions
│   ├── tools/                      # MCP tool handlers
│   │   ├── list-packages.ts        # List all packages
│   │   ├── get-package-docs.ts     # Get package documentation
│   │   ├── search-api.ts           # Search APIs/decorators/classes
│   │   ├── get-example.ts          # Get code examples by use case
│   │   ├── get-decorator-info.ts   # Get decorator details
│   │   ├── get-best-practices.ts   # Get best practices by topic
│   │   └── troubleshoot.ts         # Find solutions to issues
│   ├── prompts/                    # MCP prompt templates
│   │   ├── create-http-controller.ts   # REST API guide
│   │   ├── create-graphql-resolver.ts  # GraphQL guide
│   │   ├── setup-microservice.ts       # Microservice guide
│   │   └── setup-auth.ts               # Authentication guide
│   ├── resources/                  # MCP resources (URI handlers)
│   │   └── index.ts                # Resource handlers for nael:// URIs
│   └── docs/                       # Documentation data
│       └── packages/               # Per-package docs
│           ├── index.ts
│           ├── core.ts             # Core package docs
│           └── http.ts             # HTTP package docs
├── package.json
└── README.md
```

### Adding New Tools

1. Create a new file in `src/tools/` (e.g., `search-api.ts`)
2. Define the tool schema and handler
3. Register in `src/server.ts`
4. Add tests

Example:
```typescript
// src/tools/search-api.ts
import { Tool } from '@modelcontextprotocol/sdk/types.js';

export const searchApiTool: Tool = {
  name: 'search-api',
  description: 'Search for APIs, decorators, or classes',
  inputSchema: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Search query' }
    },
    required: ['query']
  }
};

export async function handleSearchApi(args: { query: string }) {
  // Implementation
  return { content: [{ type: 'text', text: 'Results...' }] };
}
```

### Adding Package Documentation

1. Create a new file in `src/docs/packages/` (e.g., `http.ts`)
2. Follow the `PackageDocumentation` interface from `types.ts`
3. Add comprehensive examples, API docs, best practices
4. Register in `src/docs/packages/index.ts`

## Roadmap

### Phase 1: Core Infrastructure ✅
- [x] Basic MCP server setup
- [x] `list-packages` tool
- [x] `get-package-docs` tool
- [x] Core package documentation

### Phase 2: Documentation Content ✅ COMPLETE (8/8 - 100%)
- [x] HTTP package documentation
- [x] GraphQL package documentation
- [x] Platform package documentation
- [x] Config package documentation
- [x] Logger package documentation
- [x] ORM package documentation
- [x] Auth package documentation
- [x] Microservices package documentation
- [x] 35+ comprehensive code examples (5 per package)

### Phase 3: Advanced Tools ✅
- [x] `search-api` - Search decorators, classes, methods
- [x] `get-example` - Get code examples by use case
- [x] `get-decorator-info` - Detailed decorator information
- [x] `get-best-practices` - Best practices by topic
- [x] `troubleshoot` - Common issues and solutions
- [x] MCP resources (browsable docs via URI)

### Phase 4: Prompts & Templates ✅
- [x] `create-http-controller` prompt
- [x] `create-graphql-resolver` prompt
- [x] `setup-microservice` prompt
- [x] `setup-auth` prompt
- [ ] Integration testing with Claude/Cursor

## Contributing

Contributions are welcome! Key areas:

1. **Documentation**: Add more examples, improve existing docs
2. **Tools**: Implement new MCP tools from the roadmap
3. **Testing**: Add tests for tools and documentation
4. **Examples**: Contribute runnable code examples

## License

MIT

## Related

- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Claude Desktop](https://claude.ai/desktop)
- [Cursor IDE](https://cursor.sh/)
- [Nael Framework](https://github.com/Nael-Studio/nael-platform)

## Support

- Issues: [GitHub Issues](https://github.com/Nael-Studio/nael-platform/issues)
- Discussions: [GitHub Discussions](https://github.com/Nael-Studio/nael-platform/discussions)
