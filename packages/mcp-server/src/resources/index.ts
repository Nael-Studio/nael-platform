import { Resource } from '@modelcontextprotocol/sdk/types.js';
import type { PackageName } from '../types.js';
import { packageDocs } from '../docs/packages/index.js';

// Define all available resources
export const resources: Resource[] = [
  // Package documentation resources
  {
    uri: 'nael://docs/core',
    name: 'Core Package Documentation',
    description: 'Complete documentation for @nl-framework/core',
    mimeType: 'application/json'
  },
  {
    uri: 'nael://docs/http',
    name: 'HTTP Package Documentation',
    description: 'Complete documentation for @nl-framework/http',
    mimeType: 'application/json'
  },
  {
    uri: 'nael://docs/graphql',
    name: 'GraphQL Package Documentation',
    description: 'Complete documentation for @nl-framework/graphql',
    mimeType: 'application/json'
  },
  {
    uri: 'nael://docs/platform',
    name: 'Platform Package Documentation',
    description: 'Complete documentation for @nl-framework/platform',
    mimeType: 'application/json'
  },
  {
    uri: 'nael://docs/config',
    name: 'Config Package Documentation',
    description: 'Complete documentation for @nl-framework/config',
    mimeType: 'application/json'
  },
  {
    uri: 'nael://docs/logger',
    name: 'Logger Package Documentation',
    description: 'Complete documentation for @nl-framework/logger',
    mimeType: 'application/json'
  },
  {
    uri: 'nael://docs/orm',
    name: 'ORM Package Documentation',
    description: 'Complete documentation for @nl-framework/orm',
    mimeType: 'application/json'
  },
  {
    uri: 'nael://docs/auth',
    name: 'Auth Package Documentation',
    description: 'Complete documentation for @nl-framework/auth',
    mimeType: 'application/json'
  },
  {
    uri: 'nael://docs/microservices',
    name: 'Microservices Package Documentation',
    description: 'Complete documentation for @nl-framework/microservices',
    mimeType: 'application/json'
  },
  
  // Example categories
  {
    uri: 'nael://examples/crud',
    name: 'CRUD Examples',
    description: 'Examples of Create, Read, Update, Delete operations',
    mimeType: 'application/json'
  },
  {
    uri: 'nael://examples/authentication',
    name: 'Authentication Examples',
    description: 'Examples of authentication and authorization',
    mimeType: 'application/json'
  },
  {
    uri: 'nael://examples/graphql',
    name: 'GraphQL Examples',
    description: 'Examples of GraphQL resolvers and schemas',
    mimeType: 'application/json'
  },
  {
    uri: 'nael://examples/microservices',
    name: 'Microservices Examples',
    description: 'Examples of event-driven microservices',
    mimeType: 'application/json'
  },
  
  // Guides
  {
    uri: 'nael://guides/getting-started',
    name: 'Getting Started Guide',
    description: 'Step-by-step guide to start with Nael Framework',
    mimeType: 'text/markdown'
  },
  {
    uri: 'nael://guides/best-practices',
    name: 'Best Practices Guide',
    description: 'Best practices for all packages',
    mimeType: 'text/markdown'
  },
  {
    uri: 'nael://guides/troubleshooting',
    name: 'Troubleshooting Guide',
    description: 'Common issues and solutions',
    mimeType: 'text/markdown'
  }
];

// Handler for package documentation resources
export async function handlePackageDocsResource(packageName: PackageName) {
  const docs = packageDocs[packageName];

  if (!docs) {
    return {
      contents: [
        {
          uri: `nael://docs/${packageName}`,
          mimeType: 'application/json',
          text: JSON.stringify({ error: `Package \"${packageName}\" not found.` }, null, 2)
        }
      ]
    };
  }

  return {
    contents: [
      {
        uri: `nael://docs/${packageName}`,
        mimeType: 'application/json',
        text: JSON.stringify(docs, null, 2)
      }
    ]
  };
}

// Handler for example category resources
export async function handleExampleCategoryResource(category: string) {
  const examples: any[] = [];
  
  // Collect examples from all packages that match the category
  for (const [packageName, docs] of Object.entries(packageDocs)) {
    const matchingExamples = docs.examples.filter((ex: any) =>
      ex.tags.some((tag: string) => tag.toLowerCase().includes(category.toLowerCase()))
    );
    
    examples.push(...matchingExamples.map((ex: any) => ({
      ...ex,
      package: packageName
    })));
  }
  
  return {
    contents: [
      {
        uri: `nael://examples/${category}`,
        mimeType: 'application/json',
        text: JSON.stringify({
          category,
          count: examples.length,
          examples
        }, null, 2)
      }
    ]
  };
}

// Handler for guides
export async function handleGuideResource(guideName: string) {
  let content = '';
  
  switch (guideName) {
    case 'getting-started':
      content = `# Getting Started with Nael Framework

## Installation

\`\`\`bash
# Create a new project
mkdir my-nael-app
cd my-nael-app
bun init -y

# Install core packages
bun add @nl-framework/core @nl-framework/http @nl-framework/platform
\`\`\`

## Create Your First Controller

\`\`\`typescript
// src/app.controller.ts
import { Injectable } from '@nl-framework/core';
import { Controller, Get } from '@nl-framework/http';

@Injectable()
@Controller()
export class AppController {
  @Get()
  hello() {
    return { message: 'Hello from Nael Framework!' };
  }
}
\`\`\`

## Create a Module

\`\`\`typescript
// src/app.module.ts
import { Module } from '@nl-framework/core';
import { HttpModule } from '@nl-framework/http';
import { AppController } from './app.controller';

@Module({
  imports: [
    HttpModule.forRoot({ port: 3000 })
  ],
  controllers: [AppController]
})
export class AppModule {}
\`\`\`

## Create Entry Point

\`\`\`typescript
// src/main.ts
import { NaelFactory } from '@nl-framework/platform';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NaelFactory.create(AppModule);
  await app.listen();
  console.log('🚀 Server running on http://localhost:3000');
}

bootstrap();
\`\`\`

## Run Your App

\`\`\`bash
bun run src/main.ts
\`\`\`

## Test Your API

\`\`\`bash
curl http://localhost:3000
# {"message":"Hello from Nael Framework!"}
\`\`\`

## Next Steps

1. Explore the HTTP package for REST API features
2. Add database integration with the ORM package
3. Implement authentication with the Auth package
4. Build GraphQL APIs with the GraphQL package
5. Create microservices with the Microservices package

Use the MCP tools to explore more!
`;
      break;
      
    case 'best-practices':
      content = `# Best Practices for Nael Framework

## Project Structure

\`\`\`
src/
├── controllers/     # HTTP/GraphQL controllers
├── services/        # Business logic
├── entities/        # Database entities
├── modules/         # Feature modules
├── guards/          # Authentication/authorization
├── interceptors/    # Request/response transformation
├── filters/         # Exception handling
├── pipes/           # Validation & transformation
├── app.module.ts    # Root module
└── main.ts          # Entry point
\`\`\`

## Dependency Injection

✅ **DO**: Inject dependencies via constructor
\`\`\`typescript
@Injectable()
export class UserService {
  constructor(
    private logger: Logger,
    private userRepository: UserRepository
  ) {}
}
\`\`\`

❌ **DON'T**: Use global state or singletons

## Controllers

✅ **DO**: Keep controllers thin, delegate to services
✅ **DO**: Use DTOs for type safety
✅ **DO**: Use proper HTTP status codes
❌ **DON'T**: Put business logic in controllers

## Error Handling

✅ **DO**: Use HttpException with proper status codes
✅ **DO**: Implement global exception filters
✅ **DO**: Log errors with context
❌ **DON'T**: Swallow errors silently

## Configuration

✅ **DO**: Use environment variables
✅ **DO**: Validate configuration on startup
✅ **DO**: Use type-safe configuration objects
❌ **DON'T**: Hardcode configuration values

## Testing

✅ **DO**: Write unit tests for services
✅ **DO**: Write integration tests for controllers
✅ **DO**: Mock external dependencies
❌ **DON'T**: Test implementation details

## Security

✅ **DO**: Validate all user input
✅ **DO**: Use HTTPS in production
✅ **DO**: Implement rate limiting
✅ **DO**: Use authentication and authorization
❌ **DON'T**: Trust client-side validation

## Performance

✅ **DO**: Use caching where appropriate
✅ **DO**: Implement pagination for lists
✅ **DO**: Use database indexes
✅ **DO**: Monitor performance metrics
❌ **DON'T**: N+1 queries

For package-specific best practices, use the get-best-practices tool!
`;
      break;
      
    case 'troubleshooting':
      content = `# Troubleshooting Guide

## Common Issues

### Decorator Metadata Errors

**Problem**: \`Cannot read property 'length' of undefined\`

**Solution**: Enable decorator metadata in tsconfig.json
\`\`\`json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
\`\`\`

### Dependency Injection Fails

**Problem**: \`Cannot resolve dependency\`

**Solutions**:
1. Ensure class has @Injectable() decorator
2. Register provider in module
3. Check for circular dependencies
4. Import required modules

### CORS Errors

**Problem**: Browser blocks requests

**Solution**: Configure CORS in HttpModule
\`\`\`typescript
HttpModule.forRoot({
  cors: {
    origin: 'http://localhost:5173',
    credentials: true
  }
})
\`\`\`

### Routes Not Found

**Problem**: 404 errors for valid routes

**Solutions**:
1. Verify controller is registered in module
2. Check route paths (@Controller + @Get paths)
3. Ensure module is imported in AppModule
4. Check globalPrefix setting

### Database Connection Fails

**Problem**: Cannot connect to database

**Solutions**:
1. Verify connection string
2. Check database is running
3. Verify network connectivity
4. Check authentication credentials

### Build Errors

**Problem**: TypeScript compilation fails

**Solutions**:
1. Run \`bun install\` to ensure dependencies
2. Check tsconfig.json configuration
3. Verify TypeScript version compatibility
4. Clear dist/ and rebuild

For more specific issues, use the troubleshoot tool!
`;
      break;
      
    default:
      content = `# Guide: ${guideName}

This guide is not yet available. Please check back later or use the MCP tools to explore the framework.
`;
  }
  
  return {
    contents: [
      {
        uri: `nael://guides/${guideName}`,
        mimeType: 'text/markdown',
        text: content
      }
    ]
  };
}

// Parse URI and route to appropriate handler
export async function handleResourceRead(uri: string) {
  const url = new URL(uri);
  
  if (url.protocol !== 'nael:') {
    throw new Error('Invalid protocol. Expected nael://');
  }
  
  const pathParts = url.pathname.split('/').filter(Boolean);
  const resourceType = url.hostname || pathParts.shift(); // 'docs', 'examples', or 'guides'
  const resourceId = pathParts[0]; // package name, category, or guide name
  
  switch (resourceType) {
    case 'docs':
      if (!resourceId) {
        throw new Error('Package name required for docs resource');
      }
      return await handlePackageDocsResource(resourceId as PackageName);
      
    case 'examples':
      if (!resourceId) {
        throw new Error('Category required for examples resource');
      }
      return await handleExampleCategoryResource(resourceId);
      
    case 'guides':
      if (!resourceId) {
        throw new Error('Guide name required for guides resource');
      }
      return await handleGuideResource(resourceId);
      
    default:
      throw new Error(`Unknown resource type: ${resourceType}`);
  }
}
