import { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { PackageName, PackageDocumentation, BestPractice } from '../types.js';
import { packageDocs } from '../docs/packages/index.js';

export const getBestPracticesTool: Tool = {
  name: 'get-best-practices',
  description: 'Get best practices and patterns for a specific topic or package',
  inputSchema: {
    type: 'object',
    properties: {
      topic: {
        type: 'string',
        description: 'Topic or concern (e.g., "testing", "error handling", "performance", "security")'
      },
      package: {
        type: 'string',
        enum: ['core', 'http', 'graphql', 'platform', 'config', 'logger', 'orm', 'auth', 'microservices'],
        description: 'Optional: Filter by package'
      }
    },
    required: ['topic']
  }
};

interface BestPracticeResult {
  package: string;
  category: string;
  practices: BestPractice[];
}

export async function handleGetBestPractices(args: { topic: string; package?: PackageName }) {
  const { topic, package: pkgFilter } = args;
  const searchTerm = topic.toLowerCase();
  const results: BestPracticeResult[] = [];

  // Search through all or specific package
  const packagesToSearch: Array<[PackageName, PackageDocumentation]> = (() => {
    if (pkgFilter) {
      const docs = packageDocs[pkgFilter];
      return docs ? [[pkgFilter, docs]] : [];
    }
    return Object.entries(packageDocs) as Array<[PackageName, PackageDocumentation]>;
  })();

  if (pkgFilter && packagesToSearch.length === 0) {
    return {
      content: [
        {
          type: 'text',
          text: `Package "${pkgFilter}" not found. Available packages: ${Object.keys(packageDocs).join(', ')}`
        }
      ],
      isError: true
    };
  }

  for (const [_packageName, docs] of packagesToSearch) {
    // Filter best practices that match the topic
    const matchingPractices = docs.bestPractices.filter((bp: BestPractice) => {
      const matchesCategory = bp.category.toLowerCase().includes(searchTerm);
      const matchesDos = bp.do.some(d => 
        d.title.toLowerCase().includes(searchTerm) || 
        d.description.toLowerCase().includes(searchTerm)
      );
      const matchesDonts = bp.dont.some(d => 
        d.title.toLowerCase().includes(searchTerm) || 
        d.description.toLowerCase().includes(searchTerm)
      );
      
      return matchesCategory || matchesDos || matchesDonts;
    });

    if (matchingPractices.length > 0) {
      results.push({
        package: docs.name,
        category: topic,
        practices: matchingPractices
      });
    }
  }

  if (results.length === 0) {
    return {
      content: [
        {
          type: 'text',
          text: `No best practices found for topic "${topic}". Common topics include:
- Dependency Injection
- Error Handling
- Testing
- Configuration
- Security
- Performance
- Logging
- Database Operations
- API Design

Try using 'search-api' to explore available best practices.`
        }
      ]
    };
  }

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          topic,
          count: results.reduce((sum, r) => sum + r.practices.length, 0),
          results
        }, null, 2)
      }
    ]
  };
}
