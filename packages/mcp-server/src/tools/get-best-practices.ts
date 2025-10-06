import { z } from 'zod';
import { docs } from '../docs';
import type { McpTool } from './types';
import { asTextContent } from './types';

const inputSchema = z.object({
  topic: z.string().trim().min(1).optional(),
});

export const getBestPracticesTool: McpTool<typeof inputSchema> = {
  name: 'get-best-practices',
  description: 'Get best practices, common patterns, and anti-patterns for the Nael Framework.',
  inputSchema,
  async handler(args) {
    const topic = args.topic?.toLowerCase();
    const matches = Object.entries(docs.packages).flatMap(([key, doc]) =>
      doc.bestPractices
        .filter((practice) =>
          topic ? practice.category.toLowerCase().includes(topic) : true,
        )
        .map((practice) => ({
          package: key,
          category: practice.category,
          do: practice.do,
          dont: practice.dont,
        })),
    );

    if (!matches.length) {
      return {
        content: [
          asTextContent(
            topic
              ? `No best practices found for topic "${topic}". Try another keyword or omit the filter.`
              : 'Best practices data is not available yet.',
          ),
        ],
      };
    }

    const rendered = matches
      .map((match) => {
        const doSection = match.do.map((item) => `  - ✅ ${item.title}: ${item.description}`).join('\n');
        const dontSection = match.dont.map((item) => `  - ⚠️ ${item.title}: ${item.description}`).join('\n');
        return `Package: ${match.package}\nCategory: ${match.category}\nDo:\n${doSection}\nDon't:\n${dontSection}`;
      })
      .join('\n\n');

    return {
      content: [
        asTextContent(rendered),
      ],
      structuredContent: matches,
      metadata: {
        count: matches.length,
        topic: topic ?? 'all',
      },
    };
  },
};
