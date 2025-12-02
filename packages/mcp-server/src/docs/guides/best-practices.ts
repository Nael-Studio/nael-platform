import type { GuideEntry } from '../../types';

export const bestPracticesGuide: GuideEntry = {
  id: 'best-practices',
  title: 'Best Practices for NL Framework Applications',
  summary: 'Patterns and recommendations for building scalable NL Framework services.',
  steps: [
    'Organize modules by domain and keep controllers thin.',
    'Leverage dependency injection for cross-cutting concerns like logging and configuration.',
    'Use the platform testing harness for end-to-end tests.',
    'Document custom decorators and providers to keep the MCP server useful.',
  ],
  codeSamples: [
    {
      heading: 'Domain-Oriented Module Layout',
      code: `src/
  users/
    users.module.ts
    users.controller.ts
    users.service.ts
  billing/
    billing.module.ts
`,
      description: 'Group related providers to keep module boundaries clear.',
    },
  ],
  relatedPackages: ['@nl-framework/core', '@nl-framework/http', '@nl-framework/logger'],
};
