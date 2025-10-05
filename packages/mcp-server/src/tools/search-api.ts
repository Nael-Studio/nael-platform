import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { packageDocs } from '../docs/packages/index.js';

export const searchApiTool: Tool = {
  name: 'search-api',
  description: 'Search for decorators, classes, methods, or interfaces in Nael Framework with usage examples',
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Search term (e.g., "@Controller", "Repository", "useFactory")'
      },
      type: {
        type: 'string',
        enum: ['decorator', 'class', 'method', 'interface', 'all'],
        description: 'Filter by API type'
      }
    },
    required: ['query']
  }
};

export async function handleSearchApi(args: { query: string; type?: string }) {
  const { query, type = 'all' } = args;
  const searchTerm = query.toLowerCase();
  const results: any[] = [];

  // Search through all package documentation
  for (const [packageName, docs] of Object.entries(packageDocs)) {
    // Search decorators
    if (type === 'all' || type === 'decorator') {
      docs.api.decorators?.forEach((decorator: any) => {
        if (
          decorator.name.toLowerCase().includes(searchTerm) ||
          decorator.description.toLowerCase().includes(searchTerm)
        ) {
          results.push({
            type: 'decorator',
            package: docs.name,
            name: decorator.name,
            signature: decorator.signature,
            description: decorator.description,
            example: decorator.examples[0] || null
          });
        }
      });
    }

    // Search classes
    if (type === 'all' || type === 'class') {
      docs.api.classes?.forEach((cls: any) => {
        if (
          cls.name.toLowerCase().includes(searchTerm) ||
          cls.description.toLowerCase().includes(searchTerm)
        ) {
          results.push({
            type: 'class',
            package: docs.name,
            name: cls.name,
            description: cls.description,
            methods: cls.methods.map((m: any) => m.name),
            example: cls.examples[0] || null
          });
        }
      });
    }

    // Search methods
    if (type === 'all' || type === 'method') {
      docs.api.classes?.forEach((cls: any) => {
        cls.methods.forEach((method: any) => {
          if (
            method.name.toLowerCase().includes(searchTerm) ||
            method.description.toLowerCase().includes(searchTerm)
          ) {
            results.push({
              type: 'method',
              package: docs.name,
              class: cls.name,
              name: method.name,
              signature: method.signature,
              description: method.description
            });
          }
        });
      });
    }

    // Search interfaces
    if (type === 'all' || type === 'interface') {
      docs.api.interfaces?.forEach((iface: any) => {
        if (
          iface.name.toLowerCase().includes(searchTerm) ||
          iface.description.toLowerCase().includes(searchTerm)
        ) {
          results.push({
            type: 'interface',
            package: docs.name,
            name: iface.name,
            description: iface.description,
            properties: iface.properties.map((p: any) => ({ name: p.name, type: p.type }))
          });
        }
      });
    }
  }

  if (results.length === 0) {
    return {
      content: [
        {
          type: 'text',
          text: `No results found for "${query}". Try a different search term or check the package documentation.`
        }
      ]
    };
  }

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          query,
          count: results.length,
          results: results.slice(0, 10) // Limit to 10 results
        }, null, 2)
      }
    ]
  };
}
