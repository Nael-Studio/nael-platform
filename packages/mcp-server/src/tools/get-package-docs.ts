import { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { PackageName } from '../types.js';
import { getPackageDocumentation } from '../docs/packages/index.js';

export const getPackageDocsTool: Tool = {
  name: 'get-package-docs',
  description: 'Get comprehensive documentation for a specific Nael Framework package including features, installation, API reference, and examples',
  inputSchema: {
    type: 'object',
    properties: {
      packageName: {
        type: 'string',
        enum: ['core', 'http', 'graphql', 'platform', 'config', 'logger', 'orm', 'auth', 'microservices'],
        description: 'Name of the package to get documentation for'
      }
    },
    required: ['packageName']
  }
};

export async function handleGetPackageDocs(args: { packageName: PackageName }) {
  const docs = getPackageDocumentation(args.packageName);
  
  if (!docs) {
    return {
      content: [
        {
          type: 'text',
          text: `Package "${args.packageName}" not found. Available packages: core, http, graphql, platform, config, logger, orm, auth, microservices`
        }
      ],
      isError: true
    };
  }
  
  // Format comprehensive documentation
  const formattedDocs = {
    package: docs.name,
    version: docs.version,
    description: docs.description,
    installation: docs.installation,
    features: docs.features,
    quickStart: docs.quickStart,
    decorators: docs.api.decorators?.map(d => ({
      name: d.name,
      signature: d.signature,
      description: d.description,
      parameters: d.parameters,
      example: d.examples[0] || 'No example available'
    })),
    classes: docs.api.classes?.map(c => ({
      name: c.name,
      description: c.description,
      methods: c.methods.map(m => ({
        name: m.name,
        signature: m.signature,
        description: m.description
      })),
      example: c.examples[0] || 'No example available'
    })),
    interfaces: docs.api.interfaces?.map(i => ({
      name: i.name,
      description: i.description,
      properties: i.properties
    })),
    examples: docs.examples.slice(0, 5), // Limit to first 5 examples
    bestPractices: docs.bestPractices,
    troubleshooting: docs.troubleshooting,
    relatedPackages: docs.relatedPackages
  };
  
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(formattedDocs, null, 2)
      }
    ]
  };
}
