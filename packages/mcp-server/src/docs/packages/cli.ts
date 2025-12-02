import type { PackageDocumentation } from '../../types';

export const cliDocumentation: PackageDocumentation = {
  name: '@nl-framework/cli',
  version: '0.1.5',
  description:
    'Bun-native command line interface for scaffolding NL Framework Framework services, feature modules, HTTP controllers, providers, GraphQL resolvers, models, and reusable libraries.',
  installation: `# Install globally
bun add -g @nl-framework/cli

# Or run on demand without a global install
bunx @nl-framework/cli nl --help`,
  features: [
    {
      title: 'Instant project bootstrap',
      description:
        'Run `nl new` to create a fully configured NL Framework service with Bun scripts, TypeScript config, runtime dependencies, and a starter HTTP controller.',
      icon: '🚀',
    },
    {
      title: 'Feature module scaffolding',
      description:
        'Generate feature modules with `nl g module <name>`—controllers, services, resolvers, and models folders are created alongside the module class and index exports.',
      icon: '🧩',
    },
    {
      title: 'Provider and transport generators',
      description:
        'Use `nl g service`, `nl g controller`, and `nl g resolver` to wire providers into an existing module automatically, including module metadata updates and index re-exports.',
      icon: '🛠️',
    },
    {
      title: 'GraphQL models out of the box',
      description:
        'The `nl g model` command scaffolds GraphQL object types with a default `id` field, adds model exports, and keeps the module index synchronized.',
      icon: '🧬',
    },
    {
      title: 'Reusable library workspaces',
      description:
        '`nl g lib` creates a standalone library under `./libs`, complete with build scripts, README, and TypeScript configuration tuned for Bun.',
      icon: '📦',
    },
  ],
  quickStart: {
    description: 'Install the CLI, bootstrap a service, and layer in feature scaffolding with a module, resolver, and model.',
    steps: [
      'Install the CLI globally with `bun add -g @nl-framework/cli` or run commands via `bunx`.',
      'Create a new service with `nl new inventory-service`.',
      'Change into the generated directory and install dependencies if you skipped `--install`.',
      'Scaffold a feature module with `nl g module products`.',
      'Add a GraphQL resolver with `nl g resolver products --module products`.',
      'Generate a model class using `nl g model product --module products` and extend its fields.',
      'Start the service with `bun run src/main.ts` and iterate on the generated code.',
    ],
    code: `nl new inventory-service
cd inventory-service
bun install
nl g module products
nl g resolver products --module products
nl g model product --module products
bun run src/main.ts`,
  },
  api: {
    interfaces: [
      {
        name: 'NewCommandOptions',
        description: 'Options accepted by `nl new <project-name>` when scaffolding a service.',
        properties: [
          {
            name: 'projectName',
            type: 'string',
            description: 'Target folder for the generated service.',
            required: true,
          },
          {
            name: '--install',
            type: 'boolean',
            description: 'Automatically run `bun install` after files are generated.',
            required: false,
          },
          {
            name: '--force',
            type: 'boolean',
            description: 'Allow overwriting existing files in the destination directory.',
            required: false,
          },
        ],
      },
      {
        name: 'GenerateModuleOptions',
        description: 'Arguments for `nl g module <module-name>`.',
        properties: [
          {
            name: 'moduleName',
            type: 'string',
            description: 'Name of the feature module (also used for the directory).',
            required: true,
          },
          {
            name: '--force',
            type: 'boolean',
            description: 'Overwrite existing module files and directories.',
            required: false,
          },
        ],
      },
      {
        name: 'GenerateProviderOptions',
        description: 'Arguments shared by service, controller, resolver, and model generators.',
        properties: [
          {
            name: 'name',
            type: 'string',
            description: 'Camel, kebab, or Pascal case name for the artifact (e.g., `users`).',
            required: true,
          },
          {
            name: '--module | -m',
            type: 'string',
            description: 'Existing module to target (e.g., `accounts`).',
            required: true,
          },
          {
            name: '--force',
            type: 'boolean',
            description: 'Regenerate files even when they already exist.',
            required: false,
          },
        ],
      },
      {
        name: 'GenerateLibOptions',
        description: 'Arguments for `nl g lib <lib-name>`.',
        properties: [
          {
            name: 'libName',
            type: 'string',
            description: 'Directory name for the new library workspace.',
            required: true,
          },
          {
            name: '--force',
            type: 'boolean',
            description: 'Allow library scaffolding to overwrite existing files.',
            required: false,
          },
        ],
      },
    ],
  },
  examples: [
    {
      title: 'Bootstrap a service with module and controller',
      description: 'Create the service, add a feature module, and scaffold a REST controller ready for customization.',
      code: `nl new orders-service
cd orders-service
nl g module orders
nl g service orders --module orders
nl g controller orders --module orders`,
      explanation: 'The generated module registers the service and controller automatically, so you can start implementing business logic immediately.',
      tags: ['cli', 'http', 'modules'],
    },
    {
      title: 'GraphQL-ready module with model and resolver',
      description: 'Use the CLI to produce both the GraphQL model definition and a resolver stub.',
      code: `nl g module catalog
nl g model product --module catalog
nl g resolver products --module catalog`,
      explanation: 'The model command creates `product.model.ts` with an `id` field and updates module exports. The resolver registers itself with the module providers.',
      tags: ['cli', 'graphql'],
    },
    {
      title: 'Generate a shared utility library',
      description: 'Scaffold a reusable library workspace for cross-project utilities.',
      code: `nl g lib shared-utils
cd libs/shared-utils
bun run build`,
      explanation: 'Libraries include build scripts and TypeScript configuration so they can be published or linked locally.',
      tags: ['cli', 'libraries'],
    },
  ],
  bestPractices: [
    {
      category: 'Scaffolding workflow',
      do: [
        {
          title: 'Commit generated scaffolds before editing',
          description: 'Keep a clean baseline so future `--force` runs can be diffed easily and reviewers can identify manual changes.',
        },
        {
          title: 'Use consistent naming',
          description: 'Stick with singular names for providers (e.g., `user`) when generating services or models so exported filenames stay predictable.',
        },
      ],
      dont: [
        {
          title: 'Running generators from the wrong directory',
          description: 'Avoid executing commands outside your project root; module lookups are relative to the current working directory.',
        },
      ],
    },
    {
      category: 'Force regeneration',
      do: [
        {
          title: 'Use --force sparingly',
          description: 'Before overwriting files, stash local edits or ensure changes are committed to prevent data loss.',
        },
      ],
      dont: [
        {
          title: 'Overwriting without review',
          description: 'Do not run `--force` blindly in CI scripts; confirm the target files are meant to be regenerated.',
        },
      ],
    },
  ],
  troubleshooting: [
    {
      issue: 'Module not found when generating a service, resolver, or model',
      symptoms: [
        'CLI throws `Module <name> not found` errors',
        'Generation aborts before writing any files',
      ],
      solution:
        'Ensure the target module directory exists (run `nl g module <name>` first) and execute the command from the project root so the CLI can resolve `src/modules/<name>`.',
      relatedTopics: ['modules', 'cli'],
    },
    {
      issue: 'Files already exist when running generators',
      symptoms: [
        'Command aborts with `Use --force to overwrite generated files.`',
      ],
      solution:
        'Review the existing files, commit changes if needed, then rerun the command with `--force` to allow overwriting.',
      relatedTopics: ['cli'],
    },
    {
      issue: 'GraphQL types missing ID field',
      symptoms: [
        'Generated model lacks required identifier field',
      ],
      solution:
        'Ensure you are on CLI version 0.1.5 or newer. The `nl g model` command now emits a default `id: ID!` field decorated with `@Field(() => ID)`.',
      relatedTopics: ['graphql', 'cli'],
    },
  ],
  relatedPackages: ['@nl-framework/core', '@nl-framework/http', '@nl-framework/graphql', '@nl-framework/platform'],
  changelog: [
    {
      version: '0.1.5',
      changes: [
        'Added `nl g model` command with default GraphQL `id` field and export updates.',
        'Improved CLI help output to document model generators and updated module scaffolding messaging.',
      ],
    },
    {
      version: '0.1.4',
      changes: [
        'Introduced GraphQL resolver generator with automatic module wiring.',
        'Expanded CLI documentation and README usage examples.',
      ],
    },
    {
      version: '0.1.3',
      changes: [
        'Added controller generator with route-ready stub and provider registration.',
      ],
    },
  ],
};