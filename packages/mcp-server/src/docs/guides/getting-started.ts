import type { GuideEntry } from '../../types';

export const gettingStartedGuide: GuideEntry = {
  id: 'getting-started',
  title: 'Getting Started with the Nael Framework',
  summary: 'Initialize a Bun-native project powered by the Nael Framework core modules.',
  steps: [
    'Create a new directory and run `bun init --yes` to scaffold a Bun workspace with `package.json` and `tsconfig` defaults.',
    'Add `@nl-framework/core`, `@nl-framework/platform`, and `reflect-metadata` as dependencies via `bun add`.',
    'Create an `AppModule` with controllers and services to define your application graph.',
    'Bootstrap the app with `NaelFactory.create()` and call `listen()` to start Bun-powered HTTP/GraphQL servers.',
  ],
  codeSamples: [
    {
      heading: 'Initialize Bun workspace & add dependencies',
      code: `bun init --yes
bun add @nl-framework/core @nl-framework/platform reflect-metadata`,
    },
    {
      heading: 'Minimal Bun bootstrap with NaelFactory',
      code: `import 'reflect-metadata';
import { Module } from '@nl-framework/core';
import { NaelFactory } from '@nl-framework/platform';

@Module({})
class AppModule {}

const app = await NaelFactory.create(AppModule);
const { http } = await app.listen({ http: 3000 });
const port = http?.port ?? 3000;

console.log(\`HTTP server ready on http://localhost:\${port}\`);
`,
    },
  ],
  relatedPackages: ['@nl-framework/core', '@nl-framework/platform'],
};
