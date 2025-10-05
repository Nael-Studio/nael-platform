import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { listAllPackages } from '../docs/packages/index.js';

export const listPackagesTool: Tool = {
  name: 'list-packages',
  description: 'List all available Nael Framework packages with descriptions and key features',
  inputSchema: {
    type: 'object',
    properties: {},
    required: []
  }
};

export async function handleListPackages() {
  const packages = listAllPackages();
  
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          packages: packages.map(pkg => ({
            name: pkg.name,
            description: pkg.description
          }))
        }, null, 2)
      }
    ]
  };
}
