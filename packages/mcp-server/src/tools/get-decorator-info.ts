import { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { PackageName, PackageDocumentation, DecoratorDoc } from '../types.js';
import { packageDocs } from '../docs/packages/index.js';

export const getDecoratorInfoTool: Tool = {
  name: 'get-decorator-info',
  description: 'Get detailed information about a specific decorator including signature, parameters, and usage examples',
  inputSchema: {
    type: 'object',
    properties: {
      decorator: {
        type: 'string',
        description: 'Decorator name (e.g., "@Controller", "@Injectable", "@Get")'
      },
      package: {
        type: 'string',
        enum: ['core', 'http', 'graphql', 'platform', 'config', 'logger', 'orm', 'auth', 'microservices'],
        description: 'Optional: Filter by package'
      }
    },
    required: ['decorator']
  }
};

export async function handleGetDecoratorInfo(args: { decorator: string; package?: PackageName }) {
  const { decorator, package: pkgFilter } = args;
  // Remove @ prefix if provided
  const decoratorName = decorator.startsWith('@') ? decorator.slice(1) : decorator;
  const searchTerm = decoratorName.toLowerCase();

  // Search through all or specific package
  const packagesToSearch: [string, PackageDocumentation][] = pkgFilter 
    ? [[pkgFilter, packageDocs.get(pkgFilter)!]] 
    : Object.entries(packageDocs);

  for (const [_packageName, docs] of packagesToSearch) {
    if (typeof docs === 'string') continue; // Skip if string type
    
    const decoratorDoc = docs.api.decorators?.find(
      (dec: DecoratorDoc) => dec.name.toLowerCase() === searchTerm
    );

    if (decoratorDoc) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              package: docs.name,
              decorator: decoratorDoc,
              relatedExamples: docs.examples
                .filter(ex => 
                  ex.code.includes(`@${decoratorName}`) || 
                  ex.tags.some(tag => tag.toLowerCase().includes(searchTerm))
                )
                .slice(0, 3)
            }, null, 2)
          }
        ]
      };
    }
  }

  return {
    content: [
      {
        type: 'text',
        text: `Decorator "@${decoratorName}" not found. Available decorators include:
- @Injectable, @Module (core)
- @Controller, @Get, @Post, @Put, @Delete (http)
- @Resolver, @Query, @Mutation (graphql)
- @Entity, @Column (orm)
- @Authenticated, @Authorized (auth)

Use the 'search-api' tool to find decorators.`
      }
    ]
  };
}
