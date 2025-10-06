import { z } from 'zod';
import { docs } from '../docs';
import type { McpTool } from './types';
import { asTextContent } from './types';

interface SearchHit {
  type: 'decorator' | 'class' | 'interface';
  name: string;
  description: string;
  signature?: string;
  package?: string;
  link?: string;
}

function includes(haystack: string, needle: string) {
  return haystack.toLowerCase().includes(needle.toLowerCase());
}

const inputSchema = z.object({
  query: z.string().min(1, 'query is required'),
  type: z.enum(['decorator', 'class', 'interface', 'all']).optional(),
});

export const searchApiTool: McpTool<typeof inputSchema> = {
  name: 'search-api',
  description: 'Search for decorators, classes, methods, or interfaces in Nael Framework with usage examples.',
  inputSchema,
  async handler(args) {
    const query = args.query.trim();
    const filter = args.type ?? 'all';

    if (!query) {
      return {
        content: [asTextContent('Please provide a non-empty query string.')],
      };
    }

    const hits: SearchHit[] = [];

    if (filter === 'decorator' || filter === 'all') {
      for (const decorator of docs.api.decorators) {
        if (includes(decorator.name, query) || includes(decorator.description, query)) {
          hits.push({
            type: 'decorator',
            name: decorator.name,
            description: decorator.description,
            signature: decorator.signature,
          });
        }
      }
    }

    if (filter === 'class' || filter === 'all') {
      for (const entry of docs.api.classes) {
        if (includes(entry.name, query) || includes(entry.description, query)) {
          hits.push({
            type: 'class',
            name: entry.name,
            description: entry.description,
          });
        }
      }
    }

    if (filter === 'interface' || filter === 'all') {
      for (const entry of docs.api.interfaces) {
        if (includes(entry.name, query) || includes(entry.description, query)) {
          hits.push({
            type: 'interface',
            name: entry.name,
            description: entry.description,
          });
        }
      }
    }

    if (!hits.length) {
      return {
        content: [
          asTextContent(`No API entities found for query "${query}". Try different keywords or broaden the search.`),
        ],
      };
    }

    const rendered = hits
      .map((hit, index) => {
        const signature = hit.signature ? `\nSignature: ${hit.signature}` : '';
        return `${index + 1}. [${hit.type}] ${hit.name} — ${hit.description}${signature}`;
      })
      .join('\n');

    return {
      content: [asTextContent(rendered)],
      structuredContent: hits,
      metadata: {
        count: hits.length,
        filter,
        query,
      },
    };
  },
};
