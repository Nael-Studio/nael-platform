import { z } from 'zod';
import { docs } from '../docs';
import { exampleCatalog } from '../docs/examples';
import type { McpTool } from './types';
import { asTextContent } from './types';

const packageFilterSchema =
  docs.packageKeys.length > 0
    ? z.enum([...docs.packageKeys] as [string, ...string[]])
    : z.string().min(1, 'package must not be empty');

const inputSchema = z.object({
  useCase: z.string().min(1, 'useCase is required'),
  package: packageFilterSchema.optional(),
});

export const getExampleTool: McpTool<typeof inputSchema> = {
  name: 'get-example',
  description: 'Get complete code examples for specific use cases with explanations.',
  inputSchema,
  async handler(args) {
    const searchTerm = args.useCase.toLowerCase();
    const packageFilter = args.package;
    const matches = exampleCatalog.filter((example) => {
      const inPackage = packageFilter
        ? example.relatedPackages?.some((pkg) => pkg.includes(packageFilter))
        : true;
      const inTitle = example.title.toLowerCase().includes(searchTerm);
      const inDescription = example.description.toLowerCase().includes(searchTerm);
      const inTags = example.tags?.some((tag) => tag.toLowerCase().includes(searchTerm)) ?? false;
      return inPackage && (inTitle || inDescription || inTags);
    });

    if (!matches.length) {
      return {
        content: [
          asTextContent(
            `No examples found for "${args.useCase}". Try a different phrase or run list-packages to explore modules.`,
          ),
        ],
      };
    }

    const rendered = matches
      .map((example, index) => {
        const header = `${index + 1}. ${example.title}`;
        const body = `${example.description}\n\n${example.code.trim()}`;
        const explanation = example.explanation ? `\n\n${example.explanation}` : '';
        return `${header}\n${body}${explanation}`;
      })
      .join('\n\n---\n\n');

    return {
      content: [asTextContent(rendered)],
      structuredContent: {
        examples: matches,
      },
      metadata: {
        count: matches.length,
        filteredByPackage: args.package ?? null,
      },
    };
  },
};
