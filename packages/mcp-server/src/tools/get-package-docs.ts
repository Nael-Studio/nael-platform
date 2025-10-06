import { z } from 'zod';
import { docs } from '../docs';
import type { PackageDocumentation } from '../types';
import type { McpTool } from './types';
import { asTextContent } from './types';

function renderMarkdown(doc: PackageDocumentation): string {
  const features = doc.features
    .map((feature) => `- ${feature.icon ?? '•'} **${feature.title}** — ${feature.description}`)
    .join('\n');

  const steps = doc.quickStart.steps.map((step, index) => `${index + 1}. ${step}`).join('\n');

  return `# ${doc.name}\n\n${doc.description}\n\n## Installation\n\n\`${doc.installation}\`\n\n## Key Features\n\n${features}\n\n## Quick Start\n\n${doc.quickStart.description}\n\n${steps}\n\n\n\`\`\`ts\n${doc.quickStart.code.trim()}\n\`\`\``;
}

const packageNameSchema =
  docs.packageKeys.length > 0
    ? z.enum([...docs.packageKeys] as [string, ...string[]])
    : z.string().min(1, 'packageName is required');

const inputSchema = z.object({
  packageName: packageNameSchema,
});

export const getPackageDocsTool: McpTool<typeof inputSchema> = {
  name: 'get-package-docs',
  description:
    'Get comprehensive documentation for a specific Nael Framework package including features, installation, API reference, and examples.',
  inputSchema,
  async handler(args) {
    const doc = docs.packages[args.packageName as keyof typeof docs.packages];

    if (!doc) {
      return {
        content: [
          asTextContent(
            `No documentation found for package \`${args.packageName}\`. Use list-packages to see available keys.`,
          ),
        ],
      };
    }

    return {
      content: [
        asTextContent(renderMarkdown(doc)),
      ],
      structuredContent: doc,
      metadata: {
        package: doc.name,
        version: doc.version,
      },
    };
  },
};
