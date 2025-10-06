import type { GuideEntry } from '../../types';

export const gettingStartedGuide: GuideEntry = {
  id: 'getting-started',
  title: 'Getting Started with the Nael Framework',
  summary: 'Bootstrap a fresh project using Bun and the Nael Framework core modules.',
  steps: [
    'Install Bun and create a project directory.',
    'Add `@nl-framework/core`, `@nl-framework/platform`, and `reflect-metadata` as dependencies.',
    'Create an `AppModule` with controllers and services.',
    'Use `bootstrapHttpApplication` or `Application.create` to start the app.',
  ],
  codeSamples: [
    {
      heading: 'Install dependencies',
      code: 'bun add @nl-framework/core @nl-framework/platform reflect-metadata',
    },
    {
      heading: 'Minimal AppModule',
      code: `import 'reflect-metadata';
import { Module } from '@nl-framework/core';
import { bootstrapHttpApplication } from '@nl-framework/platform';

@Module({})
class AppModule {}

await bootstrapHttpApplication(AppModule);
`,
    },
  ],
  relatedPackages: ['@nl-framework/core', '@nl-framework/platform'],
};
