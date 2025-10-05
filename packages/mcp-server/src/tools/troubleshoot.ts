import { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { PackageName, PackageDocumentation, TroubleshootingGuide } from '../types.js';
import { packageDocs } from '../docs/packages/index.js';

export const troubleshootTool: Tool = {
  name: 'troubleshoot',
  description: 'Find solutions to common issues and error messages',
  inputSchema: {
    type: 'object',
    properties: {
      issue: {
        type: 'string',
        description: 'Error message, symptom, or problem description'
      },
      package: {
        type: 'string',
        enum: ['core', 'http', 'graphql', 'platform', 'config', 'logger', 'orm', 'auth', 'microservices'],
        description: 'Optional: Filter by package where the issue occurs'
      }
    },
    required: ['issue']
  }
};

interface TroubleshootingResult {
  package: string;
  guides: TroubleshootingGuide[];
}

export async function handleTroubleshoot(args: { issue: string; package?: PackageName }) {
  const { issue, package: pkgFilter } = args;
  const searchTerm = issue.toLowerCase();
  const results: TroubleshootingResult[] = [];

  // Search through all or specific package
  const packagesToSearch: [string, PackageDocumentation][] = pkgFilter 
    ? [[pkgFilter, packageDocs.get(pkgFilter)!]] 
    : Object.entries(packageDocs);

  for (const [_packageName, docs] of packagesToSearch) {
    if (typeof docs === 'string') continue; // Skip if string type
    
    // Filter troubleshooting guides that match the issue
    const matchingGuides = docs.troubleshooting.filter((guide: TroubleshootingGuide) => {
      const matchesIssue = guide.issue.toLowerCase().includes(searchTerm);
      const matchesSymptoms = guide.symptoms.some(s => s.toLowerCase().includes(searchTerm));
      const matchesSolution = guide.solution.toLowerCase().includes(searchTerm);
      const matchesRelated = guide.relatedTopics?.some(t => t.toLowerCase().includes(searchTerm));
      
      return matchesIssue || matchesSymptoms || matchesSolution || matchesRelated;
    });

    if (matchingGuides.length > 0) {
      results.push({
        package: docs.name,
        guides: matchingGuides
      });
    }
  }

  if (results.length === 0) {
    return {
      content: [
        {
          type: 'text',
          text: `No troubleshooting guides found for issue "${issue}". 

Common issues include:
- Dependency injection errors
- Module initialization problems
- Configuration loading failures
- Database connection issues
- Authentication/authorization errors
- HTTP request/response problems
- GraphQL resolver errors

Try describing the error message or symptom more specifically, or use 'search-api' to explore available solutions.`
        }
      ]
    };
  }

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          issue,
          totalSolutions: results.reduce((sum, r) => sum + r.guides.length, 0),
          results
        }, null, 2)
      }
    ]
  };
}
