import type { ExampleCatalogEntry } from '../../types';

export const cliExamples: ExampleCatalogEntry[] = [
  {
    id: 'cli-service-bootstrap',
    category: 'cli',
    title: 'Bootstrap a new Nael service',
    description: 'Use the CLI to generate a service, install dependencies, and start the development server.',
    code: `nl new billing-service --install
cd billing-service
bun run src/main.ts`,
    explanation:
      'The `nl new` command creates a production-ready Bun project with Nael modules preconfigured. Pass `--install` to automatically install dependencies before booting.',
    tags: ['cli', 'bootstrap'],
    relatedPackages: ['@nl-framework/cli', '@nl-framework/platform'],
  },
  {
    id: 'cli-feature-module',
    category: 'cli',
    title: 'Scaffold a feature module with providers',
    description: 'Generate a module, service, controller, resolver, and model for a catalog feature.',
    code: `nl g module catalog
nl g service catalog --module catalog
nl g controller catalog --module catalog
nl g resolver catalog --module catalog
nl g model product --module catalog`,
    explanation:
      'Each generator updates module metadata and index exports automatically, leaving you with ready-to-edit providers and GraphQL models.',
    tags: ['cli', 'modules', 'graphql', 'http'],
    relatedPackages: ['@nl-framework/cli', '@nl-framework/http', '@nl-framework/graphql'],
  },
  {
    id: 'cli-shared-library',
    category: 'cli',
    title: 'Generate a reusable library workspace',
    description: 'Create a shared utilities package with build scripts and ready-to-publish configuration.',
    code: `nl g lib shared-utils
cd libs/shared-utils
bun run build`,
    explanation:
      'Library scaffolds include TypeScript build targets, README documentation, and Bun scripts so you can publish or link the package across projects.',
    tags: ['cli', 'libraries'],
    relatedPackages: ['@nl-framework/cli'],
  },
];