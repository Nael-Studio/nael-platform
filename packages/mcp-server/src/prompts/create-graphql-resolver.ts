import { Prompt } from '@modelcontextprotocol/sdk/types.js';

export const createGraphqlResolverPrompt: Prompt = {
  name: 'create-graphql-resolver',
  description: 'Guide the user through creating a GraphQL resolver with Nael Framework',
  arguments: [
    {
      name: 'typeName',
      description: 'Name of the GraphQL type (e.g., "User", "Product", "Order")',
      required: true
    },
    {
      name: 'fields',
      description: 'Comma-separated list of fields (e.g., "id:ID, name:String, email:String")',
      required: false
    },
    {
      name: 'withSubscriptions',
      description: 'Whether to include subscriptions (true/false)',
      required: false
    }
  ]
};

export async function handleCreateGraphqlResolver(args: {
  typeName?: string;
  fields?: string;
  withSubscriptions?: string;
}) {
  const { typeName = 'Example', fields, withSubscriptions } = args;
  const includeSubscriptions = withSubscriptions === 'true';
  
  const resolverName = `${typeName}Resolver`;
  const serviceName = `${typeName}Service`;
  
  // Parse fields or use defaults
  const fieldList = fields 
    ? fields.split(',').map(f => {
        const parts = f.trim().split(':');
        const name = parts[0]?.trim() || 'field';
        const type = parts[1]?.trim() || 'String';
        return { name, type };
      })
    : [
        { name: 'id', type: 'ID' },
        { name: 'name', type: 'String' },
        { name: 'createdAt', type: 'DateTime' }
      ];

  const prompt = `# Creating a ${resolverName} with Nael Framework

Let me guide you through creating a GraphQL resolver step by step.

## Step 1: Install Dependencies

\`\`\`bash
bun add @nl-framework/core @nl-framework/graphql @nl-framework/platform
${includeSubscriptions ? 'bun add graphql-subscriptions' : ''}
\`\`\`

## Step 2: Define GraphQL Types

Create \`src/graphql/types/${typeName.toLowerCase()}.type.ts\`:

\`\`\`typescript
import { ObjectType, Field, ID } from '@nl-framework/graphql';

@ObjectType()
export class ${typeName}Type {
${fieldList.map(field => `  @Field(() => ${field.type})
  ${field.name}: ${field.type === 'ID' ? 'string' : field.type === 'Int' || field.type === 'Float' ? 'number' : field.type === 'Boolean' ? 'boolean' : 'string'};
`).join('\n')}
}
\`\`\`

## Step 3: Create Input Types

Create \`src/graphql/inputs/${typeName.toLowerCase()}.input.ts\`:

\`\`\`typescript
import { InputType, Field } from '@nl-framework/graphql';

@InputType()
export class Create${typeName}Input {
${fieldList.filter(f => f.name !== 'id' && f.name !== 'createdAt').map(field => `  @Field(() => ${field.type})
  ${field.name}: ${field.type === 'Int' || field.type === 'Float' ? 'number' : field.type === 'Boolean' ? 'boolean' : 'string'};
`).join('\n')}
}

@InputType()
export class Update${typeName}Input {
  @Field(() => ID)
  id: string;

${fieldList.filter(f => f.name !== 'id' && f.name !== 'createdAt').map(field => `  @Field(() => ${field.type}, { nullable: true })
  ${field.name}?: ${field.type === 'Int' || field.type === 'Float' ? 'number' : field.type === 'Boolean' ? 'boolean' : 'string'};
`).join('\n')}
}
\`\`\`

## Step 4: Create the Resolver

Create \`src/graphql/resolvers/${typeName.toLowerCase()}.resolver.ts\`:

\`\`\`typescript
import { Injectable } from '@nl-framework/core';
import { 
  Resolver, 
  Query, 
  Mutation, 
  Args,${includeSubscriptions ? '\n  Subscription,' : ''}
  ID,
  Int
} from '@nl-framework/graphql';
${includeSubscriptions ? "import { PubSub } from 'graphql-subscriptions';" : ''}
import { ${typeName}Type } from '../types/${typeName.toLowerCase()}.type';
import { Create${typeName}Input, Update${typeName}Input } from '../inputs/${typeName.toLowerCase()}.input';

${includeSubscriptions ? `const pubSub = new PubSub();
const ${typeName.toUpperCase()}_EVENTS = {
  CREATED: '${typeName.toUpperCase()}_CREATED',
  UPDATED: '${typeName.toUpperCase()}_UPDATED',
  DELETED: '${typeName.toUpperCase()}_DELETED',
};

` : ''}@Injectable()
@Resolver(() => ${typeName}Type)
export class ${resolverName} {
  
  // In a real app, inject your service here
  // constructor(private ${typeName.toLowerCase()}Service: ${serviceName}) {}

  @Query(() => [${typeName}Type], { description: 'Get all ${typeName.toLowerCase()}s' })
  async ${typeName.toLowerCase()}s(
    @Args('limit', { type: () => Int, nullable: true, defaultValue: 10 }) limit: number,
    @Args('offset', { type: () => Int, nullable: true, defaultValue: 0 }) offset: number,
  ): Promise<${typeName}Type[]> {
    // TODO: Implement list logic
    return [];
  }

  @Query(() => ${typeName}Type, { nullable: true, description: 'Get ${typeName.toLowerCase()} by ID' })
  async ${typeName.toLowerCase()}(
    @Args('id', { type: () => ID }) id: string
  ): Promise<${typeName}Type | null> {
    // TODO: Implement get by ID logic
    return {
      id,
${fieldList.filter(f => f.name !== 'id').map(field => 
      `      ${field.name}: ${field.type === 'String' ? `'Example ${field.name}'` : field.type === 'Int' || field.type === 'Float' ? '0' : field.type === 'Boolean' ? 'false' : 'new Date()'},`
    ).join('\n')}
    };
  }

  @Mutation(() => ${typeName}Type, { description: 'Create a new ${typeName.toLowerCase()}' })
  async create${typeName}(
    @Args('input') input: Create${typeName}Input
  ): Promise<${typeName}Type> {
    // TODO: Implement create logic
    const new${typeName} = {
      id: 'new-id',
      ...input,
      createdAt: new Date(),
    };

${includeSubscriptions ? `    // Publish event
    await pubSub.publish(${typeName.toUpperCase()}_EVENTS.CREATED, {
      ${typeName.toLowerCase()}Created: new${typeName},
    });

` : ''}    return new${typeName};
  }

  @Mutation(() => ${typeName}Type, { description: 'Update an existing ${typeName.toLowerCase()}' })
  async update${typeName}(
    @Args('input') input: Update${typeName}Input
  ): Promise<${typeName}Type> {
    // TODO: Implement update logic
    const updated${typeName} = {
      ...input,
      updatedAt: new Date(),
    } as ${typeName}Type;

${includeSubscriptions ? `    // Publish event
    await pubSub.publish(${typeName.toUpperCase()}_EVENTS.UPDATED, {
      ${typeName.toLowerCase()}Updated: updated${typeName},
    });

` : ''}    return updated${typeName};
  }

  @Mutation(() => Boolean, { description: 'Delete a ${typeName.toLowerCase()}' })
  async delete${typeName}(
    @Args('id', { type: () => ID }) id: string
  ): Promise<boolean> {
    // TODO: Implement delete logic
${includeSubscriptions ? `    
    // Publish event
    await pubSub.publish(${typeName.toUpperCase()}_EVENTS.DELETED, {
      ${typeName.toLowerCase()}Deleted: { id },
    });

` : ''}    return true;
  }
${includeSubscriptions ? `
  @Subscription(() => ${typeName}Type, { description: 'Subscribe to ${typeName.toLowerCase()} creation' })
  ${typeName.toLowerCase()}Created() {
    return pubSub.asyncIterator(${typeName.toUpperCase()}_EVENTS.CREATED);
  }

  @Subscription(() => ${typeName}Type, { description: 'Subscribe to ${typeName.toLowerCase()} updates' })
  ${typeName.toLowerCase()}Updated() {
    return pubSub.asyncIterator(${typeName.toUpperCase()}_EVENTS.UPDATED);
  }

  @Subscription(() => ${typeName}Type, { description: 'Subscribe to ${typeName.toLowerCase()} deletion' })
  ${typeName.toLowerCase()}Deleted() {
    return pubSub.asyncIterator(${typeName.toUpperCase()}_EVENTS.DELETED);
  }` : ''}
}
\`\`\`

## Step 5: Create a Module

Create \`src/modules/${typeName.toLowerCase()}.module.ts\`:

\`\`\`typescript
import { Module } from '@nl-framework/core';
import { ${resolverName} } from '../graphql/resolvers/${typeName.toLowerCase()}.resolver';

@Module({
  providers: [
    ${resolverName},
    // Add your services here
    // ${serviceName}
  ],
  exports: [${resolverName}]
})
export class ${typeName}Module {}
\`\`\`

## Step 6: Register in App Module

Update \`src/app.module.ts\`:

\`\`\`typescript
import { Module } from '@nl-framework/core';
import { GraphQLModule } from '@nl-framework/graphql';
import { ${typeName}Module } from './modules/${typeName.toLowerCase()}.module';

@Module({
  imports: [
    GraphQLModule.forRoot({
      autoSchemaFile: true,
      playground: true,${includeSubscriptions ? '\n      subscriptions: {\n        \'subscriptions-transport-ws\': true,\n      },' : ''}
      context: ({ req }) => ({ req }),
    }),
    ${typeName}Module
  ]
})
export class AppModule {}
\`\`\`

## Step 7: Create Entry Point

Create \`src/main.ts\`:

\`\`\`typescript
import { NaelFactory } from '@nl-framework/platform';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NaelFactory.create(AppModule);
  await app.listen();
  console.log(\`🚀 Server is running on http://localhost:3000/graphql\`);
}

bootstrap();
\`\`\`

## Step 8: Test Your GraphQL API

Run the server:
\`\`\`bash
bun run src/main.ts
\`\`\`

Open GraphQL Playground at \`http://localhost:3000/graphql\` and try these queries:

### Query All ${typeName}s
\`\`\`graphql
query {
  ${typeName.toLowerCase()}s(limit: 10, offset: 0) {
${fieldList.map(f => `    ${f.name}`).join('\n')}
  }
}
\`\`\`

### Query Single ${typeName}
\`\`\`graphql
query {
  ${typeName.toLowerCase()}(id: "123") {
${fieldList.map(f => `    ${f.name}`).join('\n')}
  }
}
\`\`\`

### Create ${typeName}
\`\`\`graphql
mutation {
  create${typeName}(input: {
${fieldList.filter(f => f.name !== 'id' && f.name !== 'createdAt').map(f => 
    `    ${f.name}: ${f.type === 'String' ? '"Example value"' : f.type === 'Int' || f.type === 'Float' ? '123' : f.type === 'Boolean' ? 'true' : '"2024-01-01"'}`
  ).join('\n')}
  }) {
${fieldList.map(f => `    ${f.name}`).join('\n')}
  }
}
\`\`\`

### Update ${typeName}
\`\`\`graphql
mutation {
  update${typeName}(input: {
    id: "123"
    ${fieldList.find(f => f.name === 'name')?.name || 'name'}: "Updated value"
  }) {
${fieldList.map(f => `    ${f.name}`).join('\n')}
  }
}
\`\`\`

### Delete ${typeName}
\`\`\`graphql
mutation {
  delete${typeName}(id: "123")
}
\`\`\`
${includeSubscriptions ? `
### Subscribe to ${typeName} Events

\`\`\`graphql
subscription {
  ${typeName.toLowerCase()}Created {
${fieldList.map(f => `    ${f.name}`).join('\n')}
  }
}
\`\`\`

\`\`\`graphql
subscription {
  ${typeName.toLowerCase()}Updated {
${fieldList.map(f => `    ${f.name}`).join('\n')}
  }
}
\`\`\`
` : ''}

## Next Steps

1. **Add a Service Layer**: Create a \`${serviceName}\` to handle business logic
2. **Add Database Integration**: Use \`@nl-framework/orm\` for data persistence
3. **Add Field Resolvers**: Add computed fields and relations
4. **Add Authorization**: Use \`@Authorized()\` decorator for role-based access
5. **Add Validation**: Use class-validator on input types
6. **Add DataLoader**: Optimize N+1 queries with DataLoader
7. **Add Tests**: Write unit and integration tests

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
