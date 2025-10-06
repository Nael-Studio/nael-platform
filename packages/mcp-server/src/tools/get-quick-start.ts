import { z } from 'zod';
import { docs } from '../docs';
import { guides } from '../docs/guides';
import type { McpTool } from './types';
import { asTextContent } from './types';

function renderSteps(steps: string[]): string {
  return steps.map((step, index) => `${index + 1}. ${step}`).join('\n');
}

const quickStartTargetSchema =
  docs.packageKeys.length > 0
    ? z.enum(['framework', ...docs.packageKeys] as [string, ...string[]])
    : z.enum(['framework'] as [string]);

const inputSchema = z.object({
  package: quickStartTargetSchema.optional(),
});

export const getQuickStartTool: McpTool<typeof inputSchema> = {
  name: 'get-quick-start',
  description: 'Get quick start guide with installation and setup steps for the Nael Framework or a specific package.',
  inputSchema,
  async handler(args) {
    const target = args.package ?? 'framework';

    if (target === 'framework') {
      const gettingStarted = guides.find((guide) => guide.id === 'getting-started');
      if (!gettingStarted) {
        return {
          content: [asTextContent('Getting started guide is unavailable.')],
        };
      }

      return {
        content: [
          asTextContent(
            `Nael Framework Quick Start\n\n${gettingStarted.summary}\n\n${renderSteps(gettingStarted.steps)}\n\nCommands:\n${gettingStarted.codeSamples?.[0]?.code ?? ''}`,
          ),
        ],
        structuredContent: gettingStarted,
      };
    }

    const doc = docs.packages[target as keyof typeof docs.packages];
    if (!doc) {
      return {
        content: [
          asTextContent(`Unknown package \`${target}\`. Use list-packages to view supported keys.`),
        ],
      };
    }

    return {
      content: [
        asTextContent(
          `Quick Start: ${doc.name}\n\n${doc.quickStart.description}\n\n${renderSteps(doc.quickStart.steps)}\n\nCode snippet:\n${doc.quickStart.code.trim()}`,
        ),
      ],
      structuredContent: doc.quickStart,
      metadata: {
        package: doc.name,
      },
    };
  },
};
