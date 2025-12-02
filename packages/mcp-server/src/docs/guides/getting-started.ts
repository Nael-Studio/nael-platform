import type { GuideEntry } from '../../types';

export const gettingStartedGuide: GuideEntry = {
  id: 'getting-started',
  title: 'Getting Started with the NL Framework Framework',
  summary:
    'Use the Bun-native `nl` CLI to scaffold a service in seconds, then explore the manual bootstrap flow when you need full control.',
  steps: [
    'Run `nl new my-service` to generate a project preconfigured with logging, configuration, and HTTP entrypoints.',
    'Change into the new directory, execute `bun install`, and start the app with `bun run src/main.ts`.',
    'Use CLI generators like `nl g module users`, `nl g resolver users --module users`, and `nl g model user --module users` to scaffold new features instantly.',
    'Customize controllers, services, resolvers, and models under `src/` to evolve the generated scaffold.',
    'Refer to the manual bootstrap sample below if you prefer to create a NL Framework project from scratch.',
  ],
  codeSamples: [
    {
      heading: 'CLI quick start',
      code: `nl new my-service
cd my-service
bun install
nl g module users
nl g resolver users --module users
nl g model user --module users
bun run src/main.ts`,
    },
    {
      heading: 'Manual Bun bootstrap with NL FrameworkFactory',
      code: `import 'reflect-metadata';
import { Module } from '@nl-framework/core';
import { NL FrameworkFactory } from '@nl-framework/platform';

@Module({})
class AppModule {}

const app = await NL FrameworkFactory.create(AppModule);
const { http } = await app.listen({ http: 3000 });
const port = http?.port ?? 3000;

console.log(\`HTTP server ready on http://localhost:\${port}\`);
`,
    },
  ],
  relatedPackages: ['@nl-framework/core', '@nl-framework/platform'],
};
