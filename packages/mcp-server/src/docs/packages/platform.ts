import { PackageDocumentation } from '../../types.js';

export const platformPackageDocs: PackageDocumentation = {
  name: '@nl-framework/platform',
  description: 'Platform layer for NL Framework providing application bootstrapping, lifecycle management, and platform abstractions',
  version: '1.0.0',
  installation: 'bun add @nl-framework/platform @nl-framework/core',
  
  features: [
    {
      title: 'Application Factory',
      description: 'NaelFactory for bootstrapping applications with automatic module resolution',
      icon: '🏭'
    },
    {
      title: 'Lifecycle Management',
      description: 'Application lifecycle hooks for initialization and shutdown',
      icon: '♻️'
    },
    {
      title: 'Platform Adapters',
      description: 'Adapters for HTTP, WebSocket, and microservices platforms',
      icon: '🔌'
    },
    {
      title: 'Global Providers',
      description: 'Application-wide singleton services and configuration',
      icon: '🌐'
    },
    {
      title: 'Exception Handling',
      description: 'Global exception filters and error handling',
      icon: '🛡️'
    },
    {
      title: 'Graceful Shutdown',
      description: 'Automatic cleanup and resource disposal on application shutdown',
      icon: '👋'
    }
  ],
  
  quickStart: {
    description: 'Bootstrap a NL Framework application',
    steps: [
      'Install dependencies: bun add @nl-framework/platform @nl-framework/core',
      'Create an application module with @Module decorator',
      'Use NaelFactory.create() to bootstrap the application',
      'Call app.listen() to start the server',
      'Handle graceful shutdown with process signals'
    ],
    code: `import { Module } from '@nl-framework/core';
import { NaelFactory } from '@nl-framework/platform';

@Module({
  imports: [],
  controllers: [],
  providers: []
})
class AppModule {}

async function bootstrap() {
  const app = await NaelFactory.create(AppModule);
  await app.listen(3000);
  console.log('Application is running on http://localhost:3000');
}

bootstrap();`
  },
  
  api: {
    classes: [
      {
        name: 'NaelFactory',
        description: 'Factory class for creating and bootstrapping NL Framework applications',
        package: '@nl-framework/platform',
        constructor: {},
        methods: [
          {
            name: 'create',
            signature: 'static async create<T>(module: Type<T>, options?: NaelApplicationOptions): Promise<INaelApplication>',
            description: 'Create and bootstrap a NL Framework application from a root module',
            parameters: [
              {
                name: 'module',
                type: 'Type<T>',
                description: 'The root application module class decorated with @Module'
              },
              {
                name: 'options',
                type: 'NaelApplicationOptions',
                description: 'Optional configuration for the application (logger, global prefix, etc.)'
              }
            ],
            returns: 'Promise<INaelApplication>'
          },
          {
            name: 'createMicroservice',
            signature: 'static async createMicroservice<T>(module: Type<T>, options: MicroserviceOptions): Promise<INaelMicroservice>',
            description: 'Create a microservice application (no HTTP server)',
            parameters: [
              {
                name: 'module',
                type: 'Type<T>',
                description: 'The root microservice module'
              },
              {
                name: 'options',
                type: 'MicroserviceOptions',
                description: 'Microservice configuration (transport, strategy, etc.)'
              }
            ],
            returns: 'Promise<INaelMicroservice>'
          }
        ],
        examples: [
          `const app = await NaelFactory.create(AppModule);
await app.listen(3000);`,
          `const app = await NaelFactory.create(AppModule, {
  logger: ['error', 'warn'],
  globalPrefix: 'api/v1'
});`,
          `const microservice = await NaelFactory.createMicroservice(AppModule, {
  transport: 'DAPR',
  options: { appId: 'my-service' }
});`
        ]
      },
      {
        name: 'INaelApplication',
        description: 'Interface for NL Framework application instances. Provides methods for starting, stopping, and configuring the application.',
        package: '@nl-framework/platform',
        constructor: {},
        methods: [
          {
            name: 'listen',
            signature: 'async listen(port: number, hostname?: string): Promise<void>',
            description: 'Start the HTTP server and listen on the specified port',
            parameters: [
              {
                name: 'port',
                type: 'number',
                description: 'Port number to listen on'
              },
              {
                name: 'hostname',
                type: 'string',
                description: 'Optional hostname (default: 0.0.0.0)'
              }
            ],
            returns: 'Promise<void>'
          },
          {
            name: 'close',
            signature: 'async close(): Promise<void>',
            description: 'Gracefully shutdown the application and cleanup resources',
            parameters: [],
            returns: 'Promise<void>'
          },
          {
            name: 'use',
            signature: 'use(middleware: any): void',
            description: 'Register global middleware',
            parameters: [
              {
                name: 'middleware',
                type: 'any',
                description: 'Express-compatible middleware function'
              }
            ],
            returns: 'void'
          },
          {
            name: 'useGlobalFilters',
            signature: 'useGlobalFilters(...filters: ExceptionFilter[]): void',
            description: 'Register global exception filters',
            parameters: [
              {
                name: 'filters',
                type: 'ExceptionFilter[]',
                description: 'Exception filter instances'
              }
            ],
            returns: 'void'
          },
          {
            name: 'useGlobalInterceptors',
            signature: 'useGlobalInterceptors(...interceptors: Interceptor[]): void',
            description: 'Register global interceptors',
            parameters: [
              {
                name: 'interceptors',
                type: 'Interceptor[]',
                description: 'Interceptor instances'
              }
            ],
            returns: 'void'
          },
          {
            name: 'useGlobalGuards',
            signature: 'useGlobalGuards(...guards: Guard[]): void',
            description: 'Register global guards',
            parameters: [
              {
                name: 'guards',
                type: 'Guard[]',
                description: 'Guard instances'
              }
            ],
            returns: 'void'
          },
          {
            name: 'get',
            signature: 'get<T>(token: Type<T> | string | symbol): T',
            description: 'Retrieve a provider instance from the application container',
            parameters: [
              {
                name: 'token',
                type: 'Type<T> | string | symbol',
                description: 'Provider token (class, string, or symbol)'
              }
            ],
            returns: 'T'
          },
          {
            name: 'setGlobalPrefix',
            signature: 'setGlobalPrefix(prefix: string): void',
            description: 'Set a global prefix for all routes',
            parameters: [
              {
                name: 'prefix',
                type: 'string',
                description: 'URL prefix (e.g., "api", "api/v1")'
              }
            ],
            returns: 'void'
          },
          {
            name: 'enableCors',
            signature: 'enableCors(options?: CorsOptions): void',
            description: 'Enable CORS for the application',
            parameters: [
              {
                name: 'options',
                type: 'CorsOptions',
                description: 'CORS configuration options'
              }
            ],
            returns: 'void'
          }
        ],
        examples: [
          `const app = await NaelFactory.create(AppModule);
await app.listen(3000);`,
          `app.setGlobalPrefix('api/v1');
app.enableCors();
app.useGlobalFilters(new HttpExceptionFilter());`,
          `// Get service instance
const userService = app.get(UserService);
const user = await userService.findById('123');`
        ]
      }
    ],
    
    interfaces: [
      {
        name: 'NaelApplicationOptions',
        description: 'Configuration options for creating a NL Framework application',
        package: '@nl-framework/platform',
        properties: [
          {
            name: 'logger',
            type: 'boolean | LogLevel[] | Logger',
            description: 'Logger configuration: false to disable, array of log levels, or custom logger instance',
            required: false
          },
          {
            name: 'globalPrefix',
            type: 'string',
            description: 'Global URL prefix for all routes (e.g., "api", "api/v1")',
            required: false
          },
          {
            name: 'cors',
            type: 'boolean | CorsOptions',
            description: 'CORS configuration: true for default, or custom options',
            required: false
          },
          {
            name: 'bodyParser',
            type: 'boolean | BodyParserOptions',
            description: 'Body parser configuration',
            required: false
          },
          {
            name: 'httpsOptions',
            type: 'HttpsOptions',
            description: 'HTTPS configuration with cert and key',
            required: false
          }
        ],
        examples: [
          `{
  logger: ['error', 'warn', 'log'],
  globalPrefix: 'api/v1',
  cors: true
}`,
          `{
  logger: new CustomLogger(),
  cors: {
    origin: ['https://example.com'],
    credentials: true
  }
}`
        ]
      },
      {
        name: 'OnModuleInit',
        description: 'Lifecycle interface for module initialization hook. Implement this interface to run code when a module is initialized.',
        package: '@nl-framework/platform',
        properties: [
          {
            name: 'onModuleInit',
            type: '() => void | Promise<void>',
            description: 'Called after the module dependencies have been resolved',
            required: true
          }
        ],
        examples: [
          `@Injectable()
export class DatabaseService implements OnModuleInit {
  async onModuleInit() {
    console.log('Connecting to database...');
    await this.connect();
  }
}`
        ]
      },
      {
        name: 'OnModuleDestroy',
        description: 'Lifecycle interface for module cleanup hook. Implement this interface to run cleanup code when the application is shutting down.',
        package: '@nl-framework/platform',
        properties: [
          {
            name: 'onModuleDestroy',
            type: '() => void | Promise<void>',
            description: 'Called before the application shuts down',
            required: true
          }
        ],
        examples: [
          `@Injectable()
export class DatabaseService implements OnModuleDestroy {
  async onModuleDestroy() {
    console.log('Closing database connections...');
    await this.disconnect();
  }
}`
        ]
      },
      {
        name: 'OnApplicationBootstrap',
        description: 'Lifecycle interface called after all modules have been initialized. Useful for final application setup.',
        package: '@nl-framework/platform',
        properties: [
          {
            name: 'onApplicationBootstrap',
            type: '() => void | Promise<void>',
            description: 'Called after all modules have been initialized',
            required: true
          }
        ],
        examples: [
          `@Injectable()
export class AppService implements OnApplicationBootstrap {
  async onApplicationBootstrap() {
    console.log('Application is ready!');
    await this.seedDatabase();
  }
}`
        ]
      },
      {
        name: 'OnApplicationShutdown',
        description: 'Lifecycle interface called when the application is shutting down. Useful for graceful cleanup.',
        package: '@nl-framework/platform',
        properties: [
          {
            name: 'onApplicationShutdown',
            type: '(signal?: string) => void | Promise<void>',
            description: 'Called when the application receives a shutdown signal',
            required: true
          }
        ],
        examples: [
          `@Injectable()
export class CacheService implements OnApplicationShutdown {
  async onApplicationShutdown(signal?: string) {
    console.log(\`Shutting down due to \${signal}...\`);
    await this.saveCache();
  }
}`
        ]
      }
    ]
  },
  
  examples: [
    {
      title: 'Complete Application Bootstrap',
      description: 'Full example of bootstrapping a NL Framework application with configuration',
      code: `import { Module } from '@nl-framework/core';
import { NaelFactory } from '@nl-framework/platform';
import { HttpModule } from '@nl-framework/http';
import { GraphQLModule } from '@nl-framework/graphql';
import { ConfigModule } from '@nl-framework/config';

// Import your modules
import { UserModule } from './user/user.module';
import { PostModule } from './post/post.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    HttpModule,
    GraphQLModule.forRoot({
      typeDefs: './schema.graphql',
      playground: true
    }),
    UserModule,
    PostModule
  ]
})
export class AppModule {}

async function bootstrap() {
  // Create the application
  const app = await NaelFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug'],
    globalPrefix: 'api/v1',
    cors: {
      origin: ['http://localhost:3000', 'https://myapp.com'],
      credentials: true
    }
  });

  // Configure global middleware
  app.use((req, res, next) => {
    console.log(\`[\${req.method}] \${req.url}\`);
    next();
  });

  // Enable CORS
  app.enableCors();

  // Register global exception filter
  app.useGlobalFilters(new HttpExceptionFilter());

  // Register global interceptors
  app.useGlobalInterceptors(new LoggingInterceptor());

  // Start the server
  const port = process.env.PORT || 3000;
  await app.listen(port);
  
  console.log(\`🚀 Application is running on http://localhost:\${port}\`);
  console.log(\`📊 GraphQL Playground: http://localhost:\${port}/graphql\`);

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('SIGTERM received, closing application...');
    await app.close();
    process.exit(0);
  });
}

bootstrap().catch(err => {
  console.error('Failed to start application:', err);
  process.exit(1);
});`,
      tags: ['platform', 'bootstrap', 'application'],
      explanation: 'Complete application setup with modules, middleware, global filters, and graceful shutdown'
    },
    {
      title: 'Lifecycle Hooks Implementation',
      description: 'Implement lifecycle hooks for resource management',
      code: `import { Injectable, OnModuleInit, OnModuleDestroy, OnApplicationBootstrap } from '@nl-framework/platform';
import { MongoClient } from 'mongodb';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy, OnApplicationBootstrap {
  private client: MongoClient;
  private isConnected = false;

  async onModuleInit() {
    console.log('🔌 DatabaseService: Initializing module...');
    // Module dependencies are resolved, but app not ready yet
    this.client = new MongoClient(process.env.MONGODB_URI);
  }

  async onApplicationBootstrap() {
    console.log('🚀 DatabaseService: Application bootstrap...');
    // All modules initialized, safe to connect to database
    try {
      await this.client.connect();
      this.isConnected = true;
      console.log('✅ Connected to MongoDB');
      
      // Run migrations or seed data
      await this.runMigrations();
      await this.seedInitialData();
    } catch (error) {
      console.error('❌ Failed to connect to database:', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    console.log('🔌 DatabaseService: Cleaning up...');
    // Application is shutting down, close connections
    if (this.isConnected) {
      await this.client.close();
      this.isConnected = false;
      console.log('✅ Database connections closed');
    }
  }

  private async runMigrations() {
    console.log('📦 Running database migrations...');
    // Migration logic here
  }

  private async seedInitialData() {
    console.log('🌱 Seeding initial data...');
    // Seed logic here
  }

  getDatabase(name: string) {
    if (!this.isConnected) {
      throw new Error('Database not connected');
    }
    return this.client.db(name);
  }
}

// Cache service with lifecycle hooks
@Injectable()
export class CacheService implements OnModuleInit, OnApplicationShutdown {
  private cache = new Map<string, any>();
  private persistInterval: NodeJS.Timeout;

  async onModuleInit() {
    console.log('💾 CacheService: Loading cache from disk...');
    await this.loadCacheFromDisk();
    
    // Start periodic persistence
    this.persistInterval = setInterval(() => {
      this.saveCacheToDisk();
    }, 60000); // Save every minute
  }

  async onApplicationShutdown(signal?: string) {
    console.log(\`💾 CacheService: Shutting down (\${signal})...\`);
    
    // Clear interval
    if (this.persistInterval) {
      clearInterval(this.persistInterval);
    }
    
    // Save cache before shutdown
    await this.saveCacheToDisk();
    console.log('✅ Cache saved');
  }

  private async loadCacheFromDisk() {
    // Load logic
  }

  private async saveCacheToDisk() {
    // Save logic
  }

  set(key: string, value: any) {
    this.cache.set(key, value);
  }

  get(key: string) {
    return this.cache.get(key);
  }
}`,
      tags: ['platform', 'lifecycle', 'hooks'],
      explanation: 'Use lifecycle hooks for proper resource initialization and cleanup'
    },
    {
      title: 'Global Filters and Error Handling',
      description: 'Implement global exception filters for centralized error handling',
      code: `import { ExceptionFilter, Catch, ArgumentsHost, HttpException } from '@nl-framework/platform';
import { Request, Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();
    const message = exception.message;

    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message: message,
      error: exception.name
    };

    console.error(\`[\${request.method}] \${request.url} - \${status}: \${message}\`);

    response.status(status).json(errorResponse);
  }
}

// Catch all exceptions
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status = exception instanceof HttpException 
      ? exception.getStatus() 
      : 500;

    const message = exception instanceof Error 
      ? exception.message 
      : 'Internal server error';

    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message: message,
      stack: process.env.NODE_ENV === 'development' 
        ? (exception as Error).stack 
        : undefined
    };

    // Log error
    console.error('Unhandled exception:', exception);

    response.status(status).json(errorResponse);
  }
}

// Register filters in bootstrap
async function bootstrap() {
  const app = await NaelFactory.create(AppModule);

  // Register global filters
  app.useGlobalFilters(
    new HttpExceptionFilter(),
    new AllExceptionsFilter()
  );

  await app.listen(3000);
}`,
      tags: ['platform', 'error-handling', 'filters'],
      explanation: 'Centralized error handling with global exception filters'
    },
    {
      title: 'Microservice Application',
      description: 'Create a microservice without HTTP server',
      code: `import { Module } from '@nl-framework/core';
import { NaelFactory } from '@nl-framework/platform';
import { MicroservicesModule } from '@nl-framework/microservices';

@Module({
  imports: [
    MicroservicesModule.register({
      transport: 'DAPR',
      options: {
        appId: 'user-service',
        appPort: 3001,
        daprPort: 3500
      }
    })
  ],
  controllers: [UserEventController],
  providers: [UserService, EventPublisher]
})
export class UserMicroserviceModule {}

async function bootstrap() {
  // Create microservice (no HTTP server)
  const microservice = await NaelFactory.createMicroservice(
    UserMicroserviceModule,
    {
      transport: 'DAPR',
      options: {
        appId: 'user-service',
        appPort: 3001,
        daprPort: 3500
      }
    }
  );

  // Microservice listens for events via Dapr
  await microservice.listen();
  
  console.log('🔄 Microservice is running and listening for events');
  console.log('📡 Dapr sidecar port: 3500');
  console.log('🎯 App ID: user-service');

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('Shutting down microservice...');
    await microservice.close();
    process.exit(0);
  });
}

bootstrap();`,
      tags: ['platform', 'microservices', 'dapr'],
      explanation: 'Create a microservice application for event-driven architecture'
    },
    {
      title: 'Accessing Services from Application Context',
      description: 'Retrieve service instances from the application container',
      code: `import { NaelFactory } from '@nl-framework/platform';
import { Module } from '@nl-framework/core';
import { UserService } from './user/user.service';
import { ConfigService } from '@nl-framework/config';

@Module({
  imports: [],
  providers: [UserService, ConfigService]
})
export class AppModule {}

async function bootstrap() {
  const app = await NaelFactory.create(AppModule);

  // Get service instances from container
  const userService = app.get(UserService);
  const configService = app.get(ConfigService);

  // Use services outside of DI context
  const adminUser = await userService.findByEmail('admin@example.com');
  if (!adminUser) {
    console.log('Creating admin user...');
    await userService.create({
      email: 'admin@example.com',
      name: 'Admin',
      role: 'admin'
    });
  }

  // Get configuration
  const port = configService.get<number>('PORT', 3000);
  const dbUrl = configService.get<string>('DATABASE_URL');

  console.log(\`Database: \${dbUrl}\`);
  console.log(\`Starting on port: \${port}\`);

  await app.listen(port);
}

bootstrap();`,
      tags: ['platform', 'dependency-injection', 'services'],
      explanation: 'Access DI container services from bootstrap code'
    }
  ],
  
  bestPractices: [
    {
      category: 'Application Bootstrap',
      do: [
        {
          title: 'Use NaelFactory for application creation',
          description: 'Always use NaelFactory.create() to bootstrap applications properly',
          code: `async function bootstrap() {
  const app = await NaelFactory.create(AppModule);
  await app.listen(3000);
}

bootstrap();`
        },
        {
          title: 'Implement graceful shutdown',
          description: 'Handle process signals to shutdown cleanly',
          code: `process.on('SIGTERM', async () => {
  console.log('Shutting down...');
  await app.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('Shutting down...');
  await app.close();
  process.exit(0);
});`
        },
        {
          title: 'Configure logger appropriately for environment',
          description: 'Use different log levels for dev vs production',
          code: `const app = await NaelFactory.create(AppModule, {
  logger: process.env.NODE_ENV === 'production'
    ? ['error', 'warn']
    : ['error', 'warn', 'log', 'debug']
});`
        }
      ],
      dont: [
        {
          title: 'Don\'t skip error handling in bootstrap',
          description: 'Always catch and log bootstrap errors',
          code: `// Don't do this
bootstrap();

// Do this instead
bootstrap().catch(err => {
  console.error('Failed to start:', err);
  process.exit(1);
});`
        },
        {
          title: 'Don\'t forget to await app.close()',
          description: 'Resources may not cleanup properly',
          code: `// Don't do this
process.on('SIGTERM', () => {
  app.close(); // Not awaited!
  process.exit(0);
});

// Do this
process.on('SIGTERM', async () => {
  await app.close();
  process.exit(0);
});`
        },
        {
          title: 'Don\'t hardcode configuration',
          description: 'Use environment variables or ConfigService',
          code: `// Don't do this
await app.listen(3000);

// Do this
const port = process.env.PORT || 3000;
await app.listen(port);`
        }
      ]
    },
    {
      category: 'Lifecycle Hooks',
      do: [
        {
          title: 'Use OnModuleInit for service initialization',
          description: 'Initialize connections and resources when module loads',
          code: `@Injectable()
export class DatabaseService implements OnModuleInit {
  async onModuleInit() {
    await this.connect();
    console.log('Database connected');
  }
}`
        },
        {
          title: 'Use OnModuleDestroy for cleanup',
          description: 'Close connections and free resources',
          code: `@Injectable()
export class DatabaseService implements OnModuleDestroy {
  async onModuleDestroy() {
    await this.disconnect();
    console.log('Database disconnected');
  }
}`
        },
        {
          title: 'Handle errors in lifecycle hooks',
          description: 'Log and potentially re-throw errors',
          code: `async onModuleInit() {
  try {
    await this.connect();
  } catch (error) {
    console.error('Failed to connect:', error);
    throw error;
  }
}`
        }
      ],
      dont: [
        {
          title: 'Don\'t perform heavy operations in constructor',
          description: 'Use OnModuleInit instead',
          code: `// Don't do this
constructor() {
  this.connect(); // Synchronous constructor
}

// Do this
async onModuleInit() {
  await this.connect();
}`
        },
        {
          title: 'Don\'t ignore lifecycle hook errors',
          description: 'Errors should be logged and handled',
          code: `// Don't do this
async onModuleInit() {
  this.connect(); // Not awaited, errors ignored
}

// Do this
async onModuleInit() {
  try {
    await this.connect();
  } catch (error) {
    console.error('Init failed:', error);
    throw error;
  }
}`
        }
      ]
    },
    {
      category: 'Global Configuration',
      do: [
        {
          title: 'Set global prefix for API versioning',
          description: 'Use global prefix for consistent API structure',
          code: `const app = await NaelFactory.create(AppModule);
app.setGlobalPrefix('api/v1');
// All routes: /api/v1/users, /api/v1/posts, etc.`
        },
        {
          title: 'Enable CORS for web clients',
          description: 'Configure CORS for security and access',
          code: `app.enableCors({
  origin: ['https://myapp.com'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE']
});`
        },
        {
          title: 'Use global filters for consistent errors',
          description: 'Register exception filters globally',
          code: `app.useGlobalFilters(
  new HttpExceptionFilter(),
  new AllExceptionsFilter()
);`
        }
      ],
      dont: [
        {
          title: 'Don\'t enable CORS for all origins in production',
          description: 'This is a security risk',
          code: `// Don't do this in production
app.enableCors({
  origin: '*' // Allows any origin!
});

// Do this
app.enableCors({
  origin: ['https://myapp.com', 'https://admin.myapp.com']
});`
        },
        {
          title: 'Don\'t skip global exception handling',
          description: 'Unhandled errors will crash the app',
          code: `// Don't skip this
app.useGlobalFilters(new AllExceptionsFilter());`
        }
      ]
    }
  ],
  
  troubleshooting: [
    {
      issue: 'Application fails to start / Module not found',
      symptoms: [
        'Error: "Cannot find module"',
        'Application crashes on startup',
        'Module resolution errors'
      ],
      solution: 'Ensure all modules are properly imported and registered in the root module',
      code: `// Check that all modules are imported
@Module({
  imports: [
    HttpModule,        // ✓ Imported
    GraphQLModule.forRoot({ ... }),  // ✓ Imported
    UserModule,        // ✓ Imported
    // PostModule,     // ✗ Missing - add this!
  ]
})
export class AppModule {}

// Also check file paths
import { UserModule } from './user/user.module'; // Correct path?`
    },
    {
      issue: 'Port already in use / EADDRINUSE error',
      symptoms: [
        'Error: listen EADDRINUSE',
        'Port 3000 is already in use',
        'Cannot bind to port'
      ],
      solution: 'Check if another process is using the port or use a different port',
      code: `// Option 1: Use different port
await app.listen(3001); // Try different port

// Option 2: Use environment variable
const port = process.env.PORT || 3000;
await app.listen(port);

// Option 3: Kill process using the port (macOS/Linux)
// lsof -ti:3000 | xargs kill -9`
    },
    {
      issue: 'Lifecycle hooks not being called',
      symptoms: [
        'onModuleInit not executing',
        'Resources not initializing',
        'onModuleDestroy not running on shutdown'
      ],
      solution: 'Ensure service implements the lifecycle interface and is registered as a provider',
      code: `// Must implement the interface
@Injectable()
export class MyService implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    console.log('Init called');
  }

  async onModuleDestroy() {
    console.log('Destroy called');
  }
}

// Must be registered in module
@Module({
  providers: [MyService]  // Must be registered!
})
export class AppModule {}`
    },
    {
      issue: 'Cannot get service from app.get()',
      symptoms: [
        'app.get(Service) returns undefined',
        'Service not found in container',
        'Cannot resolve dependency'
      ],
      solution: 'Ensure service is registered as a provider in a module',
      code: `// Service must be registered
@Module({
  providers: [UserService]  // Register here
})
export class AppModule {}

// Then you can get it
const app = await NaelFactory.create(AppModule);
const userService = app.get(UserService); // Now works!`
    },
    {
      issue: 'Global filters/interceptors/guards not working',
      symptoms: [
        'Global exception filter not catching errors',
        'Global interceptor not executing',
        'Global guard not protecting routes'
      ],
      solution: 'Register global components after creating the app but before calling listen()',
      code: `async function bootstrap() {
  const app = await NaelFactory.create(AppModule);

  // Register BEFORE app.listen()
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());
  app.useGlobalGuards(new AuthGuard());

  // Then start the server
  await app.listen(3000);
}`
    }
  ],
  
  relatedPackages: ['@nl-framework/core', '@nl-framework/http', '@nl-framework/microservices'],
  
  changelog: [
    {
      version: '1.0.0',
      changes: [
        'Initial release with NaelFactory',
        'Application lifecycle management',
        'Global filters, interceptors, and guards',
        'HTTP and microservice platform adapters',
        'Graceful shutdown support'
      ]
    }
  ]
};
