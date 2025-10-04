import { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { PackageName, PackageDocumentation, CodeExample } from '../types.js';
import { packageDocs } from '../docs/packages/index.js';

export const getExampleTool: Tool = {
  name: 'get-example',
  description: 'Get complete code examples for specific use cases with explanations',
  inputSchema: {
    type: 'object',
    properties: {
      useCase: {
        type: 'string',
        description: 'Use case description (e.g., "create REST API", "setup authentication", "MongoDB integration")'
      },
      package: {
        type: 'string',
        enum: ['core', 'http', 'graphql', 'platform', 'config', 'logger', 'orm', 'auth', 'microservices'],
        description: 'Optional: Filter examples by package'
      }
    },
    required: ['useCase']
  }
};

interface ExampleResult {
  package: string;
  title: string;
  description: string;
  code: string;
  explanation?: string;
  tags: string[];
}

export async function handleGetExample(args: { useCase: string; package?: PackageName }) {
  const { useCase, package: pkgFilter } = args;
  const searchTerm = useCase.toLowerCase();
  const examples: ExampleResult[] = [];

  // Search through all or specific package
  const packagesToSearch: [string, PackageDocumentation][] = pkgFilter 
    ? [[pkgFilter, packageDocs[pkgFilter]]] 
    : Object.entries(packageDocs);

  for (const [_packageName, docs] of packagesToSearch) {
    if (typeof docs === 'string') continue; // Skip if string type
    
    docs.examples.forEach((example: CodeExample) => {
      // Match against title, description, or tags
      const matchesTitle = example.title.toLowerCase().includes(searchTerm);
      const matchesDescription = example.description.toLowerCase().includes(searchTerm);
      const matchesTags = example.tags.some((tag: string) => tag.toLowerCase().includes(searchTerm));

      if (matchesTitle || matchesDescription || matchesTags) {
        examples.push({
          package: docs.name,
          title: example.title,
          description: example.description,
          code: example.code,
          explanation: example.explanation,
          tags: example.tags
        });
      }
    });
  }

  if (examples.length === 0) {
    return {
      content: [
        {
          type: 'text',
          text: `No examples found for use case "${useCase}". Try:
- "dependency injection"
- "REST API"
- "GraphQL resolver"
- "microservice"
- "authentication"
- "database"
- "configuration"
- "logging"`
        }
      ]
    };
  }

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          useCase,
          count: examples.length,
          examples: examples.slice(0, 5) // Limit to 5 examples
        }, null, 2)
      }
    ]
  };
}
