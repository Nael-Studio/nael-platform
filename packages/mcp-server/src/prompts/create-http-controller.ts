import { Prompt } from '@modelcontextprotocol/sdk/types.js';

export const createHttpControllerPrompt: Prompt = {
  name: 'create-http-controller',
  description: 'Guide the user through creating a REST API controller with Nael Framework',
  arguments: [
    {
      name: 'controllerName',
      description: 'Name of the controller (e.g., "User", "Product", "Order")',
      required: true
    },
    {
      name: 'endpoints',
      description: 'Comma-separated list of endpoints (e.g., "GET /users, POST /users, GET /users/:id")',
      required: false
    },
    {
      name: 'withAuth',
      description: 'Whether to include authentication (true/false)',
      required: false
    }
  ]
};

export async function handleCreateHttpController(args: {
  controllerName?: string;
  endpoints?: string;
  withAuth?: string;
}) {
  const { controllerName = 'Example', endpoints, withAuth } = args;
  const includeAuth = withAuth === 'true';
  
  const controllerClassName = `${controllerName}Controller`;
  const routePath = `/${controllerName.toLowerCase()}s`;
  
  // Parse endpoints or use defaults
  const endpointList = endpoints 
    ? endpoints.split(',').map(e => e.trim())
    : [
        `GET ${routePath}`,
        `GET ${routePath}/:id`,
        `POST ${routePath}`,
        `PUT ${routePath}/:id`,
        `DELETE ${routePath}/:id`
      ];

  let prompt = `# Creating a ${controllerClassName} with Nael Framework

Let me guide you through creating a REST API controller step by step.

## Step 1: Install Dependencies

\`\`\`bash
bun add @nl-framework/core @nl-framework/http @nl-framework/platform
${includeAuth ? 'bun add @nl-framework/auth' : ''}
\`\`\`

## Step 2: Create the Controller

Create \`src/controllers/${controllerName.toLowerCase()}.controller.ts\`:

\`\`\`typescript
import { Injectable } from '@nl-framework/core';
import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete,
  Body,
  Param,
  Query,
  HttpException,
  HttpStatus
} from '@nl-framework/http';
${includeAuth ? "import { Authenticated, Authorized } from '@nl-framework/auth';" : ''}

interface ${controllerName}Dto {
  id?: string;
  name: string;
  // Add your fields here
}

@Injectable()
@Controller('${routePath}')
${includeAuth ? '@Authenticated() // Require authentication for all endpoints' : ''}
export class ${controllerClassName} {
  
  // In a real app, inject your service here
  // constructor(private ${controllerName.toLowerCase()}Service: ${controllerName}Service) {}

  @Get()
  async findAll(@Query() query: any) {
    // TODO: Implement list logic
    return {
      data: [],
      total: 0,
      page: query.page || 1,
      limit: query.limit || 10
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    // TODO: Implement get by ID logic
    if (!id) {
      throw new HttpException('ID is required', HttpStatus.BAD_REQUEST);
    }
    
    return {
      id,
      name: 'Example ${controllerName}'
    };
  }

  @Post()
  ${includeAuth ? "@Authorized(['admin', 'editor']) // Only admins and editors can create" : ''}
  async create(@Body() dto: ${controllerName}Dto) {
    // TODO: Implement create logic
    // Validate input
    if (!dto.name) {
      throw new HttpException('Name is required', HttpStatus.BAD_REQUEST);
    }
    
    return {
      id: 'new-id',
      ...dto,
      createdAt: new Date()
    };
  }

  @Put(':id')
  ${includeAuth ? "@Authorized(['admin', 'editor'])" : ''}
  async update(@Param('id') id: string, @Body() dto: Partial<${controllerName}Dto>) {
    // TODO: Implement update logic
    if (!id) {
      throw new HttpException('ID is required', HttpStatus.BAD_REQUEST);
    }
    
    return {
      id,
      ...dto,
      updatedAt: new Date()
    };
  }

  @Delete(':id')
  ${includeAuth ? "@Authorized(['admin']) // Only admins can delete" : ''}
  async delete(@Param('id') id: string) {
    // TODO: Implement delete logic
    if (!id) {
      throw new HttpException('ID is required', HttpStatus.BAD_REQUEST);
    }
    
    return {
      message: '${controllerName} deleted successfully',
      id
    };
  }
}
\`\`\`

## Step 3: Create a Module

Create \`src/modules/${controllerName.toLowerCase()}.module.ts\`:

\`\`\`typescript
import { Module } from '@nl-framework/core';
import { ${controllerClassName} } from '../controllers/${controllerName.toLowerCase()}.controller';

@Module({
  controllers: [${controllerClassName}],
  providers: [
    // Add your services here
    // ${controllerName}Service
  ],
  exports: []
})
export class ${controllerName}Module {}
\`\`\`

## Step 4: Register in App Module

Update \`src/app.module.ts\`:

\`\`\`typescript
import { Module } from '@nl-framework/core';
import { HttpModule } from '@nl-framework/http';
${includeAuth ? "import { AuthModule } from '@nl-framework/auth';" : ''}
import { ${controllerName}Module } from './modules/${controllerName.toLowerCase()}.module';

@Module({
  imports: [
    HttpModule.forRoot({
      port: 3000,
      cors: true
    }),
${includeAuth ? `    AuthModule.forRoot({
      providers: {
        // Configure your auth provider
      }
    }),` : ''}
    ${controllerName}Module
  ]
})
export class AppModule {}
\`\`\`

## Step 5: Create Entry Point

Create \`src/main.ts\`:

\`\`\`typescript
import { NaelFactory } from '@nl-framework/platform';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NaelFactory.create(AppModule);
  await app.listen();
  console.log(\`🚀 Server is running on http://localhost:3000\`);
}

bootstrap();
\`\`\`

## Step 6: Test Your API

Run the server:
\`\`\`bash
bun run src/main.ts
\`\`\`

Test the endpoints:
\`\`\`bash
${endpointList.map(endpoint => {
  const parts = endpoint.split(' ');
  const method = parts[0];
  const path = parts[1] || '/';
  const fullPath = `http://localhost:3000${path.replace(':id', '123')}`;
  
  if (method === 'GET') {
    return `# ${endpoint}\ncurl ${fullPath}`;
  } else if (method === 'POST') {
    return `# ${endpoint}\ncurl -X POST ${fullPath.replace('/123', '')} \\\n  -H "Content-Type: application/json" \\\n  -d '{"name": "Test ${controllerName}"}'`;
  } else if (method === 'PUT') {
    return `# ${endpoint}\ncurl -X PUT ${fullPath} \\\n  -H "Content-Type: application/json" \\\n  -d '{"name": "Updated ${controllerName}"}'`;
  } else if (method === 'DELETE') {
    return `# ${endpoint}\ncurl -X DELETE ${fullPath}`;
  }
  return `# ${endpoint}\ncurl -X ${method} ${fullPath}`;
}).join('\n\n')}
\`\`\`

## Next Steps

1. **Add a Service Layer**: Create a \`${controllerName}Service\` to handle business logic
2. **Add Database Integration**: Use \`@nl-framework/orm\` for data persistence
3. **Add Validation**: Use class-validator for DTO validation
4. **Add Documentation**: Use Swagger/OpenAPI decorators
5. **Add Tests**: Write unit and integration tests

${includeAuth ? `
## Authentication Notes

Since you've included authentication:
- All endpoints require authentication by default (\`@Authenticated()\`)
- Specific roles are required for create/update/delete operations
- Configure your auth provider in AuthModule
- Add JWT or session-based authentication
- Test with authenticated requests:

\`\`\`bash
# Login first to get a token
curl -X POST http://localhost:3000/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"email": "user@example.com", "password": "password"}'

# Use the token in subsequent requests
curl http://localhost:3000${routePath} \\
  -H "Authorization: Bearer YOUR_TOKEN"
\`\`\`
` : ''}

Need help with any of these steps? Just ask!
`;

  return {
    messages: [
      {
        role: 'assistant',
        content: {
          type: 'text',
          text: prompt
        }
      }
    ]
  };
}
