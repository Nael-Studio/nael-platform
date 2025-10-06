import { z } from 'zod';
import { docs } from '../docs';
import type { McpTool } from './types';
import { asTextContent } from './types';

const inputSchema = z.object({
  decorator: z.string().min(1, 'decorator is required'),
});

export const getDecoratorInfoTool: McpTool<typeof inputSchema> = {
  name: 'get-decorator-info',
  description: 'Get detailed information about a specific decorator including signature, parameters, and usage examples.',
  inputSchema,
  async handler(args) {
    const target = args.decorator.trim();
    const match = docs.api.decorators.find((entry) => entry.name === target);

    if (!match) {
      const available = docs.api.decorators.map((entry) => entry.name).join(', ');
      return {
        content: [
          asTextContent(`Decorator ${target} is not documented yet. Available decorators: ${available}.`),
        ],
      };
    }

    const parametersSection =
      match.parameters?.map((param) => `- ${param.name}: ${param.type} — ${param.description}`).join('\n') ??
      'None';
    const examplesSection = match.examples?.map((example) => `Example:\n${example}`).join('\n\n') ?? '';

    return {
      content: [
        asTextContent(
          `${match.name}\n\n${match.description}\n\nSignature:\n${match.signature}\n\nParameters:\n${parametersSection}${examplesSection ? `\n\n${examplesSection}` : ''}`,
        ),
      ],
      structuredContent: match,
    };
  },
};
