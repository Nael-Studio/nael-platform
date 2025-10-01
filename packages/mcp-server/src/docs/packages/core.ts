import type { PackageDocumentation, ClassDoc } from '../../types.js';

export const corePackageDocs: PackageDocumentation = {
  name: '@nl-framework/core',
  version: '0.1.0',
  description: 'Foundation of the Nael Framework, providing dependency injection, module system, and application bootstrapping',
  installation: 'bun add @nl-framework/core',
  
  features: [
    {
      title: 'Dependency Injection',
      description: 'Constructor-based injection with token resolution for flexible dependency management',
      icon: '🔧'
    },
    {
      title: 'Module System',
      description: '@Module() decorator for organizing providers, controllers, and imports',
      icon: '📦'
    },
    {
      title: 'Decorators',
      description: '@Injectable() and @Controller() for marking classes in the DI container',
      icon: '✨'
    },
    {
      title: 'Application Context',
      description: 'Centralized access to resolved instances and configuration',
      icon: '🎯'
    },
    {
      title: 'Lifecycle Hooks',
      description: 'onModuleInit() and onModuleDestroy() for managing component lifecycle',
      icon: '♻️'
    }
  ],
  
  quickStart: {
    description: 'Create a basic application with dependency injection',
    steps: [
      'Install the core package',
      'Create a service with @Injectable()',
      'Create a module with @Module()',
      'Bootstrap the application'
    ],
    code: `import { Module, Injectable, Application } from '@nl-framework/core';

@Injectable()
export class UserService {
  getUser(id: string) {
    return { id, name: 'John Doe' };
  }
}

@Module({
  providers: [UserService],
})
export class AppModule {}

// Bootstrap the application
const app = new Application();
const context = await app.bootstrap(AppModule);

// Access services
const userService = await context.get(UserService);
console.log(userService.getUser('123'));`
  },
  
  api: {
    decorators: [
      {
        name: '@Injectable',
        signature: '@Injectable()',
        parameters: [],
        description: 'Marks a class as injectable, making it available for dependency injection',
        examples: [
          `@Injectable()
export class UserService {
  constructor(private logger: Logger) {}
  
  getUser(id: string) {
    this.logger.info('Getting user', { id });
    return { id, name: 'John' };
  }
}`
        ],
        package: '@nl-framework/core'
      },
      {
        name: '@Module',
        signature: '@Module(metadata: ModuleMetadata)',
        parameters: [
          {
            name: 'metadata',
            type: 'ModuleMetadata',
            description: 'Module configuration including providers, controllers, imports, and exports',
            required: true
          }
        ],
        description: 'Declares a module that organizes related providers and controllers',
        examples: [
          `@Module({
  imports: [ConfigModule, LoggerModule],
  providers: [UserService, AuthService],
  controllers: [UserController],
  exports: [UserService]
})
export class UserModule {}`,
          `@Module({
  providers: [
    { provide: 'API_KEY', useValue: process.env.API_KEY },
    {
      provide: 'DATABASE',
      useFactory: async (config: ConfigService) => {
        return await createConnection(config.get('database'));
      },
      inject: [ConfigService]
    }
  ]
})
export class AppModule {}`
        ],
        package: '@nl-framework/core'
      }
    ],
    
    classes: [
      {
        name: 'Application',
        description: 'Main application class for bootstrapping the framework',
        package: '@nl-framework/core',
        constructor: {
          parameters: []
        },
        methods: [
          {
            name: 'bootstrap',
            signature: 'async bootstrap(rootModule: ClassType, options?: ApplicationOptions): Promise<ApplicationContext>',
            description: 'Bootstrap the application with the root module and optional configuration',
            parameters: [
              {
                name: 'rootModule',
                type: 'ClassType',
                description: 'The root module class'
              },
              {
                name: 'options',
                type: 'ApplicationOptions',
                description: 'Optional configuration for config and logger'
              }
            ],
            returns: 'Promise<ApplicationContext>'
          }
        ],
        examples: [
          `const app = new Application();
const context = await app.bootstrap(AppModule, {
  config: {
    dir: './config',
    env: 'development'
  },
  logger: {
    level: 'info',
    pretty: true
  }
});`
        ]
      },
      ({
        name: 'ApplicationContext',
        description: 'Application context providing access to the DI container and resolved instances',
        package: '@nl-framework/core',
        methods: [
          {
            name: 'get',
            signature: 'async get<T>(token: Token<T>): Promise<T>',
            description: 'Resolve a provider from the DI container',
            parameters: [
              {
                name: 'token',
                type: 'Token<T>',
                description: 'Class, string, or symbol token'
              }
            ],
            returns: 'Promise<T>'
          },
          {
            name: 'getControllers',
            signature: 'getControllers<T = unknown>(module?: ClassType): T[]',
            description: 'Get all controllers or controllers from a specific module',
            returns: 'T[]'
          },
          {
            name: 'getResolvers',
            signature: 'getResolvers<T = unknown>(module?: ClassType): T[]',
            description: 'Get all GraphQL resolvers or resolvers from a specific module',
            returns: 'T[]'
          },
          {
            name: 'close',
            signature: 'async close(): Promise<void>',
            description: 'Close the application and cleanup resources',
            returns: 'Promise<void>'
          }
        ],
        examples: [
          `const context = await app.bootstrap(AppModule);

// Get a service
const userService = await context.get(UserService);

// Get all controllers
const controllers = context.getControllers();

// Cleanup
await context.close();`
        ]
      } as ClassDoc)
    ],
    
    interfaces: [
      {
        name: 'ModuleMetadata',
        description: 'Configuration metadata for a module',
        package: '@nl-framework/core',
        properties: [
          {
            name: 'imports',
            type: 'ClassType[]',
            description: 'Modules to import',
            required: false
          },
          {
            name: 'providers',
            type: 'Provider[]',
            description: 'Providers to register in this module',
            required: false
          },
          {
            name: 'controllers',
            type: 'ClassType[]',
            description: 'Controllers to register',
            required: false
          },
          {
            name: 'resolvers',
            type: 'ClassType[]',
            description: 'GraphQL resolvers to register',
            required: false
          },
          {
            name: 'exports',
            type: '(ClassType | Token)[]',
            description: 'Providers to export for use in other modules',
            required: false
          }
        ]
      },
      {
        name: 'Provider',
        description: 'Provider configuration for dependency injection',
        package: '@nl-framework/core',
        properties: [
          {
            name: 'provide',
            type: 'Token',
            description: 'Token to register the provider under',
            required: true
          },
          {
            name: 'useClass',
            type: 'ClassType',
            description: 'Class to instantiate',
            required: false
          },
          {
            name: 'useValue',
            type: 'any',
            description: 'Value to provide',
            required: false
          },
          {
            name: 'useFactory',
            type: '(...args: any[]) => any | Promise<any>',
            description: 'Factory function to create the provider',
            required: false
          },
          {
            name: 'inject',
            type: 'Token[]',
            description: 'Dependencies to inject into the factory',
            required: false
          }
        ],
        examples: [
          `// Class provider
{ provide: UserService, useClass: UserService }

// Value provider
{ provide: 'API_KEY', useValue: process.env.API_KEY }

// Factory provider
{
  provide: 'DATABASE',
  useFactory: async (config: ConfigService) => {
    return await createConnection(config.get('database'));
  },
  inject: [ConfigService]
}`
        ]
      }
    ]
  },
  
  examples: [
    {
      title: 'Basic Service with Dependency Injection',
      description: 'Create a service that depends on other services',
      code: `import { Injectable } from '@nl-framework/core';
import { Logger } from '@nl-framework/logger';
import { ConfigService } from '@nl-framework/config';

@Injectable()
export class UserService {
  constructor(
    private logger: Logger,
    private config: ConfigService
  ) {}

  async getUser(id: string) {
    this.logger.info('Fetching user', { id });
    const apiUrl = this.config.get('api.baseUrl');
    // Fetch user from API...
    return { id, name: 'John Doe' };
  }
}`,
      explanation: 'Services are marked with @Injectable() and can inject dependencies through their constructor',
      tags: ['dependency-injection', 'service', 'basic']
    },
    {
      title: 'Module with Multiple Providers',
      description: 'Organize related providers in a module',
      code: `import { Module } from '@nl-framework/core';
import { UserService } from './user.service';
import { UserRepository } from './user.repository';
import { UserController } from './user.controller';

@Module({
  providers: [
    UserService,
    UserRepository,
    { provide: 'USER_CONFIG', useValue: { maxUsers: 1000 } }
  ],
  controllers: [UserController],
  exports: [UserService] // Export for use in other modules
})
export class UserModule {}`,
      explanation: 'Modules group related functionality and can export providers for other modules to use',
      tags: ['module', 'providers', 'organization']
    },
    {
      title: 'Factory Provider with Async Initialization',
      description: 'Use a factory to create providers with async setup',
      code: `import { Module } from '@nl-framework/core';
import { ConfigService } from '@nl-framework/config';

@Module({
  providers: [
    {
      provide: 'DATABASE_CONNECTION',
      useFactory: async (config: ConfigService) => {
        const dbConfig = config.get('database');
        const connection = await createConnection(dbConfig);
        await connection.connect();
        return connection;
      },
      inject: [ConfigService]
    }
  ],
  exports: ['DATABASE_CONNECTION']
})
export class DatabaseModule {}`,
      explanation: 'Factory providers allow async initialization and dependency injection',
      tags: ['factory', 'async', 'database']
    },
    {
      title: 'Lifecycle Hooks',
      description: 'Use lifecycle hooks for initialization and cleanup',
      code: `import { Injectable } from '@nl-framework/core';

@Injectable()
export class CacheService {
  private cache: Map<string, any>;

  async onModuleInit() {
    this.cache = new Map();
    console.log('Cache initialized');
  }

  async onModuleDestroy() {
    this.cache.clear();
    console.log('Cache cleared');
  }

  set(key: string, value: any) {
    this.cache.set(key, value);
  }

  get(key: string) {
    return this.cache.get(key);
  }
}`,
      explanation: 'Implement onModuleInit() for setup and onModuleDestroy() for cleanup',
      tags: ['lifecycle', 'hooks', 'initialization']
    }
  ],
  
  bestPractices: [
    {
      category: 'Dependency Injection',
      do: [
        {
          title: 'Use constructor injection',
          description: 'Always inject dependencies through the constructor',
          code: `@Injectable()
export class UserService {
  constructor(
    private logger: Logger,
    private repo: UserRepository
  ) {}
}`
        },
        {
          title: 'Mark classes with @Injectable()',
          description: 'All services should be decorated with @Injectable()',
          code: `@Injectable()
export class EmailService {
  sendEmail(to: string, subject: string) {
    // ...
  }
}`
        }
      ],
      dont: [
        {
          title: "Don't use new to create services",
          description: 'Let the DI container manage instances',
          code: `// ❌ Bad
const userService = new UserService();

// ✅ Good
constructor(private userService: UserService) {}`
        },
        {
          title: "Don't create circular dependencies",
          description: 'Avoid A depends on B and B depends on A',
          code: `// ❌ Bad - circular dependency
@Injectable()
export class ServiceA {
  constructor(private serviceB: ServiceB) {}
}

@Injectable()
export class ServiceB {
  constructor(private serviceA: ServiceA) {}
}`
        }
      ]
    },
    {
      category: 'Module Organization',
      do: [
        {
          title: 'Group related functionality',
          description: 'Keep related services, controllers, and repositories in the same module',
          code: `@Module({
  providers: [UserService, UserRepository],
  controllers: [UserController],
  exports: [UserService]
})
export class UserModule {}`
        },
        {
          title: 'Export only necessary providers',
          description: 'Only export providers that other modules need',
          code: `@Module({
  providers: [UserService, UserRepository],
  exports: [UserService] // Only export UserService
})
export class UserModule {}`
        }
      ],
      dont: [
        {
          title: "Don't create god modules",
          description: 'Split large modules into smaller, focused modules',
          code: `// ❌ Bad - too much in one module
@Module({
  providers: [
    UserService, OrderService, PaymentService,
    EmailService, NotificationService, ...
  ]
})`
        }
      ]
    }
  ],
  
  troubleshooting: [
    {
      issue: 'Provider not found error',
      symptoms: [
        'Error: Provider for token "ServiceName" not found',
        'Cannot resolve dependencies'
      ],
      solution: 'Ensure the provider is registered in the module\'s providers array or imported from another module',
      code: `// Make sure the service is provided
@Module({
  providers: [UserService], // Add here
  controllers: [UserController]
})
export class AppModule {}`
    },
    {
      issue: 'Circular dependency detected',
      symptoms: [
        'Maximum call stack size exceeded',
        'Circular dependency warning'
      ],
      solution: 'Refactor to remove circular dependencies. Consider using forwardRef() or extracting shared logic into a third service',
      code: `// Extract shared logic into a third service
@Injectable()
export class SharedService {
  // Shared logic here
}

@Injectable()
export class ServiceA {
  constructor(private shared: SharedService) {}
}

@Injectable()
export class ServiceB {
  constructor(private shared: SharedService) {}
}`,
      relatedTopics: ['dependency-injection', 'module-organization']
    }
  ],
  
  relatedPackages: [
    '@nl-framework/logger',
    '@nl-framework/config',
    '@nl-framework/http'
  ]
};
