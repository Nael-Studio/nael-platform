import type { GuideEntry } from '../../types';

export const troubleshootingGuide: GuideEntry = {
  id: 'troubleshooting',
  title: 'Troubleshooting Common Issues',
  summary: 'Diagnose and resolve frequently encountered framework issues.',
  steps: [
    'Check build output for TypeScript metadata and ensure `emitDecoratorMetadata` is enabled.',
    'Verify `reflect-metadata` is imported once before any decorators execute.',
    'Confirm configuration files are readable and environment variables are correctly prefixed.',
    'Enable verbose logging via `@nl-framework/logger` to trace lifecycle events.',
  ],
  codeSamples: [
    {
      heading: 'Enable Debug Logging',
      code: `const logger = new Logger({ level: 'debug' });
await bootstrapHttpApplication(AppModule, { logger });
`,
    },
  ],
  relatedPackages: ['@nl-framework/logger', '@nl-framework/config'],
};
