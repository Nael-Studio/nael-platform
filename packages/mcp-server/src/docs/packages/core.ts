import type { PackageDocumentation } from '../../types';

export const coreDocumentation: PackageDocumentation = {
  name: '@nl-framework/core',
  version: '0.1.0',
  description:
    'Foundational runtime for the NL Framework Framework. Provides dependency injection, module lifecycle, configuration loading, and application bootstrap primitives.',
  installation: 'bun add @nl-framework/core reflect-metadata',
  features: [
    {
      title: 'Modular Architecture',
      description:
        'Compose applications from modules with predictable dependency graphs powered by the DI container.',
      icon: '🧩',
    },
    {
      title: 'Lifecycle Hooks',
      description:
        'Implement `OnModuleInit` and `OnModuleDestroy` to manage resources across the application lifecycle.',
      icon: '🔄',
    },
    {
      title: 'Config Integration',
      description:
        'First-class configuration loading with schema validation via the Config package integration.',
      icon: '⚙️',
    },
  ],
  quickStart: {
    description: 'Set up a minimal NL Framework application with a service and module.',
    steps: [
      'Install `@nl-framework/core` and enable the Reflect metadata polyfill once.',
      'Create injectable services and modules with the provided decorators.',
      'Bootstrap the application via `Application.create()` and `app.init()`. ',
    ],
    code: `import 'reflect-metadata';
import { Application, Module, Injectable, Inject } from '@nl-framework/core';

@Injectable()
class HelloService {
  getGreeting(name: string) {
    return \`Hello, \${name}!\`;
  }
}

@Module({
  providers: [HelloService],
})
class AppModule {}

const app = await Application.create(AppModule);
const context = app.getApplicationContext();
const service = context.get(HelloService);

console.log(service.getGreeting('NL Framework Developer'));
await app.init();
await app.close();
`,
  },
  api: {
    decorators: [
      {
        name: '@Module',
        signature: "@Module(metadata: ModuleMetadata): ClassDecorator",
        description:
          'Registers a class as a module, providing providers, imports, and exports to the application container.',
        parameters: [
          {
            name: 'providers',
            type: 'Provider[]',
            description: 'Services, factories, and values available within the module.',
            required: false,
          },
          {
            name: 'imports',
            type: 'ClassType[]',
            description: 'Other modules that should be merged into the container scope.',
            required: false,
          },
        ],
        examples: [
          `@Module({
  providers: [UsersService],
  imports: [DatabaseModule],
})
export class UsersModule {}
`,
        ],
      },
      {
        name: '@Injectable',
        signature: '@Injectable(options?: { scope?: "singleton" | "transient" }): ClassDecorator',
        description:
          'Marks a class as a provider that can participate in dependency injection with optional scoping rules.',
        parameters: [
          {
            name: 'scope',
            type: '"singleton" | "transient"',
            description: 'Control provider instantiation strategy.',
            required: false,
          },
        ],
      },
    ],
    classes: [
      {
        name: 'Application',
        description: 'Factory responsible for bootstrapping modules, managing lifecycle hooks, and exposing the container.',
        methods: [
          {
            name: 'create',
            signature: 'static async create(rootModule: ClassType, options?: ApplicationOptions): Promise<Application>',
            description: 'Initialize the DI container, register global providers, and return the running application.',
          },
          {
            name: 'getApplicationContext',
            signature: 'getApplicationContext(): ApplicationContext',
            description: 'Retrieve the container accessor to resolve providers and modules.',
          },
          {
            name: 'init',
            signature: 'init(): Promise<void>',
            description: 'Execute pending lifecycle hooks and mark the app as ready.',
          },
        ],
        examples: [
          `const app = await Application.create(AppModule, {
  logger: new Logger(),
});
await app.init();
`,
        ],
      },
    ],
  },
  examples: [
    {
      title: 'Feature Module with Scoped Provider',
      description: 'Demonstrates transient scoped providers within a feature module.',
      code: `@Injectable({ scope: 'transient' })
class RequestIdProvider {
  private readonly id = crypto.randomUUID();
  get value() {
    return this.id;
  }
}

@Module({ providers: [RequestIdProvider] })
export class RequestContextModule {}
`,
      explanation: 'Every injection of `RequestIdProvider` creates a new instance, ideal for per-request context.',
      tags: ['di', 'scoping'],
    },
  ],
  bestPractices: [
    {
      category: 'Dependency Injection',
      do: [
        {
          title: 'Keep modules focused',
          description: 'Group providers by bounded context to keep dependency graphs understandable.',
        },
        {
          title: 'Embrace interfaces',
          description: 'Depend on tokens (symbols) instead of concrete classes when crossing module boundaries.',
        },
      ],
      dont: [
        {
          title: 'Don’t instantiate providers manually',
          description: 'Let the container handle lifecycle and configuration for you.',
        },
      ],
    },
  ],
  troubleshooting: [
    {
      issue: 'Provider not found',
      symptoms: ['Runtime error: Unknown provider token'],
      solution:
        'Ensure the provider is listed in the module metadata and that the module is imported by the consumer module.',
      relatedTopics: ['module imports', 'provider tokens'],
    },
  ],
  relatedPackages: [
    '@nl-framework/config',
    '@nl-framework/logger',
    '@nl-framework/platform',
  ],
};
