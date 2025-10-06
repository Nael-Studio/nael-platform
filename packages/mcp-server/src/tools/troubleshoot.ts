import { z } from 'zod';
import { docs } from '../docs';
import type { McpTool } from './types';
import { asTextContent } from './types';

const inputSchema = z.object({
  error: z.string().trim().min(1).optional(),
  topic: z.string().trim().min(1).optional(),
});

export const troubleshootTool: McpTool<typeof inputSchema> = {
  name: 'troubleshoot',
  description: 'Get solutions for common issues, errors, and troubleshooting guidance.',
  inputSchema,
  async handler(args) {
    const normalizedError = args.error?.toLowerCase() ?? '';
    const normalizedTopic = args.topic?.toLowerCase() ?? '';

    const matches = Object.entries(docs.packages).flatMap(([key, doc]) =>
      doc.troubleshooting
        .filter((item) => {
          const inError = normalizedError
            ? item.issue.toLowerCase().includes(normalizedError) ||
              item.symptoms.some((symptom) => symptom.toLowerCase().includes(normalizedError))
            : true;
          const inTopic = normalizedTopic
            ? item.relatedTopics?.some((topic) => topic.toLowerCase().includes(normalizedTopic)) ?? false
            : true;
          return inError && inTopic;
        })
        .map((item) => ({ package: key, ...item })),
    );

    if (!matches.length) {
      return {
        content: [
          asTextContent('No troubleshooting entry matched the provided filters.'),
        ],
      };
    }

    const rendered = matches
      .map((item) => {
        const symptoms = item.symptoms.map((symptom) => `  - ${symptom}`).join('\n');
        return `Package: ${item.package}\nIssue: ${item.issue}\nSymptoms:\n${symptoms}\nSolution: ${item.solution}`;
      })
      .join('\n\n');

    return {
      content: [asTextContent(rendered)],
      structuredContent: matches,
      metadata: {
        count: matches.length,
      },
    };
  },
};
