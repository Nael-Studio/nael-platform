import type { PackageDocumentation } from '../../types';

export const configDocumentation: PackageDocumentation = {
  name: '@nl-framework/config',
  version: '0.1.0',
  description:
    'Configuration layer with YAML parsing, environment merging, and strong typing designed for Bun and NL Framework applications.',
  installation: 'bun add @nl-framework/config yaml',
  features: [
    {
      title: 'Hierarchical Sources',
      description: 'Merge config values from YAML files, environment variables, and in-memory overrides.',
      icon: '🪜',
    },
    {
      title: 'Schema Guards',
      description: 'Validate configuration shapes before bootstrapping the application.',
      icon: '✅',
    },
    {
      title: 'Hot Reload',
      description: 'Watch YAML files and propagate changes to subscribers for local development.',
      icon: '♻️',
    },
  ],
  quickStart: {
    description: 'Load YAML configuration and expose a typed API through the ConfigService.',
    steps: [
      'Create a YAML file in `config/default.yaml`.',
      'Provide a loader via the ConfigModule or `ConfigLoader` from core.',
      'Inject `ConfigService` and read strongly-typed values.',
    ],
    code: `import { Module } from '@nl-framework/core';
import { ConfigModule, ConfigService } from '@nl-framework/config';

@Module({
  imports: [ConfigModule.forRoot({
    filePath: 'config/default.yaml',
  })],
})
class AppModule {
  constructor(config: ConfigService) {
    const port = config.get<number>('http.port', 3000);
    console.log('Configured port', port);
  }
}
`,
  },
  api: {
    classes: [
      {
        name: 'ConfigService',
        description: 'Runtime accessor for configuration values with path lookup and defaults.',
        methods: [
          {
            name: 'get',
            signature: 'get<T>(path: string, defaultValue?: T): T',
            description: 'Retrieve a value by dotted path, returning the default when undefined.',
          },
          {
            name: 'onChange',
            signature: 'onChange(path: string, listener: (value: unknown) => void): () => void',
            description: 'Subscribe to configuration updates for dynamic features.',
          },
        ],
      },
    ],
  },
  examples: [
    {
      title: 'Environment Overrides',
      description: 'Override YAML configuration with environment-specific values.',
      code: `process.env['NAEL__HTTP__PORT'] = '4000';
const port = config.get('http.port'); // -> 4000
`,
    },
  ],
  bestPractices: [
    {
      category: 'Configuration Management',
      do: [
        {
          title: 'Commit defaults, not secrets',
          description: 'Keep sanitized defaults in version control and load secrets via environment variables.',
        },
      ],
      dont: [
        {
          title: 'Avoid ad-hoc config objects',
          description: 'Use the shared ConfigService to remain consistent across packages.',
        },
      ],
    },
  ],
  troubleshooting: [
    {
      issue: 'Missing config file',
      symptoms: ['Application throws ENOENT during bootstrap'],
      solution: 'Ensure the `config/default.yaml` file exists or provide an alternate path via `ConfigModule.forRoot`.',
    },
  ],
  relatedPackages: ['@nl-framework/core', '@nl-framework/platform'],
};
