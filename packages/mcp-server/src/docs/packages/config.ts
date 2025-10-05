import { PackageDocumentation } from '../../types.js';

export const configPackageDocs: PackageDocumentation = {
  name: '@nl-framework/config',
  description: 'Configuration management for NL Framework with environment variables, file loading, validation, and type safety',
  version: '1.0.0',
  installation: 'bun add @nl-framework/config @nl-framework/core',
  
  features: [
    {
      title: 'Environment Variables',
      description: 'Load and manage environment variables with .env file support',
      icon: '🔐'
    },
    {
      title: 'Configuration Files',
      description: 'Support for JSON, YAML, and TypeScript configuration files',
      icon: '📄'
    },
    {
      title: 'Type Safety',
      description: 'Strongly typed configuration with TypeScript support',
      icon: '🔒'
    },
    {
      title: 'Validation',
      description: 'Built-in validation with custom validation schemas',
      icon: '✅'
    },
    {
      title: 'Nested Configuration',
      description: 'Access nested configuration values with dot notation',
      icon: '🎯'
    },
    {
      title: 'Multiple Environments',
      description: 'Load different configurations for dev, staging, production',
      icon: '🌍'
    }
  ],
  
  quickStart: {
    description: 'Set up configuration management in your application',
    steps: [
      'Install dependencies: bun add @nl-framework/config',
      'Create a .env file in your project root',
      'Register ConfigModule in your app module',
      'Inject ConfigService into your services',
      'Access configuration values with type safety'
    ],
    code: `// .env file
DATABASE_URL=mongodb://localhost:27017/myapp
PORT=3000
JWT_SECRET=your-secret-key

// app.module.ts
import { Module } from '@nl-framework/core';
import { ConfigModule } from '@nl-framework/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env'
    })
  ]
})
export class AppModule {}

// user.service.ts
import { Injectable } from '@nl-framework/core';
import { ConfigService } from '@nl-framework/config';

@Injectable()
export class UserService {
  constructor(private configService: ConfigService) {}

  getJwtSecret() {
    return this.configService.get<string>('JWT_SECRET');
  }
}`
  },
  
  api: {
    classes: [
      {
        name: 'ConfigModule',
        description: 'Module for managing application configuration',
        package: '@nl-framework/config',
        constructor: {},
        methods: [
          {
            name: 'forRoot',
            signature: 'static forRoot(options?: ConfigModuleOptions): DynamicModule',
            description: 'Register ConfigModule for the root application',
            parameters: [
              {
                name: 'options',
                type: 'ConfigModuleOptions',
                description: 'Configuration options including envFilePath, isGlobal, validation'
              }
            ],
            returns: 'DynamicModule'
          },
          {
            name: 'forFeature',
            signature: 'static forFeature(config: Record<string, any>): DynamicModule',
            description: 'Register feature-specific configuration',
            parameters: [
              {
                name: 'config',
                type: 'Record<string, any>',
                description: 'Feature configuration object'
              }
            ],
            returns: 'DynamicModule'
          }
        ],
        examples: [
          `ConfigModule.forRoot({
  isGlobal: true,
  envFilePath: '.env'
})`,
          `ConfigModule.forRoot({
  isGlobal: true,
  envFilePath: ['.env', '.env.local'],
  load: [databaseConfig, appConfig]
})`
        ]
      },
      {
        name: 'ConfigService',
        description: 'Service for accessing configuration values throughout the application',
        package: '@nl-framework/config',
        constructor: {},
        methods: [
          {
            name: 'get',
            signature: 'get<T = any>(key: string, defaultValue?: T): T',
            description: 'Get a configuration value by key with optional default',
            parameters: [
              {
                name: 'key',
                type: 'string',
                description: 'Configuration key (supports dot notation for nested values)'
              },
              {
                name: 'defaultValue',
                type: 'T',
                description: 'Default value if key is not found'
              }
            ],
            returns: 'T'
          },
          {
            name: 'getOrThrow',
            signature: 'getOrThrow<T = any>(key: string): T',
            description: 'Get a configuration value or throw an error if not found',
            parameters: [
              {
                name: 'key',
                type: 'string',
                description: 'Configuration key'
              }
            ],
            returns: 'T'
          },
          {
            name: 'has',
            signature: 'has(key: string): boolean',
            description: 'Check if a configuration key exists',
            parameters: [
              {
                name: 'key',
                type: 'string',
                description: 'Configuration key to check'
              }
            ],
            returns: 'boolean'
          },
          {
            name: 'set',
            signature: 'set(key: string, value: any): void',
            description: 'Set a configuration value at runtime',
            parameters: [
              {
                name: 'key',
                type: 'string',
                description: 'Configuration key'
              },
              {
                name: 'value',
                type: 'any',
                description: 'Value to set'
              }
            ],
            returns: 'void'
          },
          {
            name: 'getAll',
            signature: 'getAll(): Record<string, any>',
            description: 'Get all configuration values',
            parameters: [],
            returns: 'Record<string, any>'
          }
        ],
        examples: [
          `const dbUrl = this.configService.get<string>('DATABASE_URL');
const port = this.configService.get<number>('PORT', 3000);`,
          `// Nested values with dot notation
const host = this.configService.get('database.host');
const port = this.configService.get('database.port');`,
          `// Get or throw if missing
const apiKey = this.configService.getOrThrow<string>('API_KEY');`
        ]
      }
    ],
    
    interfaces: [
      {
        name: 'ConfigModuleOptions',
        description: 'Configuration options for ConfigModule',
        package: '@nl-framework/config',
        properties: [
          {
            name: 'isGlobal',
            type: 'boolean',
            description: 'Make ConfigModule available globally (default: false)',
            required: false
          },
          {
            name: 'envFilePath',
            type: 'string | string[]',
            description: 'Path(s) to .env file(s). Can be a single path or array of paths.',
            required: false
          },
          {
            name: 'ignoreEnvFile',
            type: 'boolean',
            description: 'Ignore .env file and only use process.env (default: false)',
            required: false
          },
          {
            name: 'ignoreEnvVars',
            type: 'boolean',
            description: 'Ignore process.env variables (default: false)',
            required: false
          },
          {
            name: 'load',
            type: 'ConfigFactory[]',
            description: 'Array of configuration factory functions',
            required: false
          },
          {
            name: 'validate',
            type: '(config: Record<string, any>) => Record<string, any>',
            description: 'Validation function for configuration',
            required: false
          },
          {
            name: 'validationSchema',
            type: 'any',
            description: 'Joi validation schema for configuration',
            required: false
          },
          {
            name: 'expandVariables',
            type: 'boolean',
            description: 'Enable variable expansion in .env (e.g., ${VAR}) (default: false)',
            required: false
          }
        ],
        examples: [
          `{
  isGlobal: true,
  envFilePath: '.env',
  expandVariables: true
}`,
          `{
  isGlobal: true,
  envFilePath: ['.env', '.env.local'],
  load: [databaseConfig, redisConfig],
  validate: validateConfig
}`
        ]
      },
      {
        name: 'ConfigFactory',
        description: 'Factory function type for loading configuration',
        package: '@nl-framework/config',
        properties: [
          {
            name: 'factory',
            type: '() => Record<string, any> | Promise<Record<string, any>>',
            description: 'Function that returns configuration object',
            required: true
          }
        ],
        examples: [
          `// database.config.ts
export default () => ({
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD
  }
});`
        ]
      }
    ]
  },
  
  examples: [
    {
      title: 'Basic Configuration Setup',
      description: 'Set up configuration with environment variables and access values',
      code: `// .env file
NODE_ENV=development
PORT=3000
DATABASE_URL=mongodb://localhost:27017/myapp
JWT_SECRET=my-secret-key
JWT_EXPIRES_IN=7d

// app.module.ts
import { Module } from '@nl-framework/core';
import { ConfigModule } from '@nl-framework/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,  // Make available globally
      envFilePath: '.env'
    })
  ],
  providers: [AppService, DatabaseService]
})
export class AppModule {}

// app.service.ts
import { Injectable } from '@nl-framework/core';
import { ConfigService } from '@nl-framework/config';

@Injectable()
export class AppService {
  constructor(private configService: ConfigService) {}

  getAppInfo() {
    return {
      environment: this.configService.get<string>('NODE_ENV'),
      port: this.configService.get<number>('PORT', 3000),
      databaseUrl: this.configService.get<string>('DATABASE_URL')
    };
  }

  getJwtConfig() {
    return {
      secret: this.configService.getOrThrow<string>('JWT_SECRET'),
      expiresIn: this.configService.get<string>('JWT_EXPIRES_IN', '1d')
    };
  }
}

// database.service.ts
@Injectable()
export class DatabaseService {
  private connectionString: string;

  constructor(private configService: ConfigService) {
    // Get config in constructor
    this.connectionString = this.configService.getOrThrow<string>('DATABASE_URL');
  }

  async connect() {
    console.log(\`Connecting to: \${this.connectionString}\`);
    // Connection logic here
  }
}`,
      tags: ['config', 'environment', 'setup'],
      explanation: 'Basic configuration setup with environment variables and type-safe access'
    },
    {
      title: 'Configuration Factories',
      description: 'Use configuration factory functions for complex, structured configuration',
      code: `// config/database.config.ts
export default () => ({
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 27017,
    name: process.env.DB_NAME || 'myapp',
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10
    }
  }
});

// config/redis.config.ts
export default () => ({
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB, 10) || 0,
    keyPrefix: process.env.REDIS_KEY_PREFIX || 'app:'
  }
});

// config/app.config.ts
export default () => ({
  app: {
    name: process.env.APP_NAME || 'MyApp',
    env: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT, 10) || 3000,
    globalPrefix: process.env.GLOBAL_PREFIX || 'api',
    cors: {
      enabled: process.env.CORS_ENABLED === 'true',
      origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000']
    }
  }
});

// app.module.ts
import { Module } from '@nl-framework/core';
import { ConfigModule } from '@nl-framework/config';
import databaseConfig from './config/database.config';
import redisConfig from './config/redis.config';
import appConfig from './config/app.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', \`.env.\${process.env.NODE_ENV}\`],
      load: [databaseConfig, redisConfig, appConfig]
    })
  ]
})
export class AppModule {}

// Using nested configuration
@Injectable()
export class DatabaseService {
  constructor(private configService: ConfigService) {}

  async connect() {
    const host = this.configService.get<string>('database.host');
    const port = this.configService.get<number>('database.port');
    const dbName = this.configService.get<string>('database.name');
    
    console.log(\`Connecting to MongoDB at \${host}:\${port}/\${dbName}\`);
    // Connection logic
  }
}

@Injectable()
export class RedisService {
  constructor(private configService: ConfigService) {}

  getConnectionOptions() {
    return {
      host: this.configService.get('redis.host'),
      port: this.configService.get('redis.port'),
      password: this.configService.get('redis.password'),
      db: this.configService.get('redis.db'),
      keyPrefix: this.configService.get('redis.keyPrefix')
    };
  }
}`,
      tags: ['config', 'factories', 'nested'],
      explanation: 'Organize configuration into structured factories for better maintainability'
    },
    {
      title: 'Configuration Validation',
      description: 'Validate configuration with Joi schemas to ensure correctness',
      code: `// validation.schema.ts
import * as Joi from 'joi';

export const configValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test', 'staging')
    .default('development'),
  
  PORT: Joi.number()
    .port()
    .default(3000),
  
  DATABASE_URL: Joi.string()
    .uri()
    .required(),
  
  JWT_SECRET: Joi.string()
    .min(32)
    .required(),
  
  JWT_EXPIRES_IN: Joi.string()
    .default('7d'),
  
  REDIS_HOST: Joi.string()
    .default('localhost'),
  
  REDIS_PORT: Joi.number()
    .port()
    .default(6379),
  
  API_KEY: Joi.string()
    .required(),
  
  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'info', 'debug')
    .default('info')
});

// app.module.ts
import { Module } from '@nl-framework/core';
import { ConfigModule } from '@nl-framework/config';
import { configValidationSchema } from './validation.schema';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validationSchema: configValidationSchema,
      validationOptions: {
        allowUnknown: true,  // Allow env vars not in schema
        abortEarly: false    // Validate all fields
      }
    })
  ]
})
export class AppModule {}

// Custom validation function
function validateConfig(config: Record<string, any>) {
  // Check required fields
  const required = ['DATABASE_URL', 'JWT_SECRET', 'API_KEY'];
  for (const key of required) {
    if (!config[key]) {
      throw new Error(\`Missing required configuration: \${key}\`);
    }
  }

  // Validate types
  if (config.PORT && typeof config.PORT !== 'number') {
    config.PORT = parseInt(config.PORT, 10);
  }

  // Validate ranges
  if (config.PORT < 1 || config.PORT > 65535) {
    throw new Error('PORT must be between 1 and 65535');
  }

  return config;
}

// Using custom validation
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validate: validateConfig
    })
  ]
})
export class AppModule {}`,
      tags: ['config', 'validation', 'joi'],
      explanation: 'Ensure configuration is valid using Joi schemas or custom validation'
    },
    {
      title: 'Multiple Environment Files',
      description: 'Load different configuration files based on environment',
      code: `// Project structure:
// .env                  <- Base configuration
// .env.development      <- Development overrides
// .env.production       <- Production overrides
// .env.test            <- Test overrides
// .env.local           <- Local overrides (gitignored)

// .env (base configuration)
APP_NAME=MyApp
PORT=3000
LOG_LEVEL=info

// .env.development
NODE_ENV=development
DATABASE_URL=mongodb://localhost:27017/myapp_dev
LOG_LEVEL=debug
ENABLE_PLAYGROUND=true

// .env.production
NODE_ENV=production
DATABASE_URL=mongodb://prod-server:27017/myapp
LOG_LEVEL=error
ENABLE_PLAYGROUND=false

// .env.local (local overrides, not committed)
DATABASE_URL=mongodb://localhost:27017/myapp_local
JWT_SECRET=local-dev-secret-123

// app.module.ts
import { Module } from '@nl-framework/core';
import { ConfigModule } from '@nl-framework/config';

const envFilePath = [
  '.env',                                    // Base
  \`.env.\${process.env.NODE_ENV || 'development'}\`,  // Environment-specific
  '.env.local'                               // Local overrides (highest priority)
];

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath,  // Load multiple files in order
      expandVariables: true  // Allow variable expansion
    })
  ]
})
export class AppModule {}

// .env with variable expansion
DATABASE_HOST=localhost
DATABASE_PORT=27017
DATABASE_NAME=myapp
DATABASE_URL=mongodb://\${DATABASE_HOST}:\${DATABASE_PORT}/\${DATABASE_NAME}

// Usage in service
@Injectable()
export class AppService {
  constructor(private configService: ConfigService) {}

  logConfig() {
    console.log('Environment:', this.configService.get('NODE_ENV'));
    console.log('Port:', this.configService.get('PORT'));
    console.log('Database:', this.configService.get('DATABASE_URL'));
    console.log('Log Level:', this.configService.get('LOG_LEVEL'));
    console.log('Playground:', this.configService.get('ENABLE_PLAYGROUND'));
  }
}`,
      tags: ['config', 'environments', 'dotenv'],
      explanation: 'Manage different configurations for dev, staging, production environments'
    },
    {
      title: 'Type-Safe Configuration',
      description: 'Create strongly typed configuration with TypeScript',
      code: `// config/config.interface.ts
export interface DatabaseConfig {
  host: string;
  port: number;
  name: string;
  username?: string;
  password?: string;
}

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
}

export interface AppConfig {
  name: string;
  env: 'development' | 'production' | 'test';
  port: number;
  globalPrefix: string;
}

export interface JwtConfig {
  secret: string;
  expiresIn: string;
}

export interface Config {
  database: DatabaseConfig;
  redis: RedisConfig;
  app: AppConfig;
  jwt: JwtConfig;
}

// config/config.service.ts
import { Injectable } from '@nl-framework/core';
import { ConfigService as BaseConfigService } from '@nl-framework/config';
import { Config, DatabaseConfig, RedisConfig, AppConfig, JwtConfig } from './config.interface';

@Injectable()
export class TypedConfigService {
  constructor(private configService: BaseConfigService) {}

  get database(): DatabaseConfig {
    return {
      host: this.configService.get<string>('database.host'),
      port: this.configService.get<number>('database.port'),
      name: this.configService.get<string>('database.name'),
      username: this.configService.get<string>('database.username'),
      password: this.configService.get<string>('database.password')
    };
  }

  get redis(): RedisConfig {
    return {
      host: this.configService.get<string>('redis.host'),
      port: this.configService.get<number>('redis.port'),
      password: this.configService.get<string>('redis.password'),
      db: this.configService.get<number>('redis.db')
    };
  }

  get app(): AppConfig {
    return {
      name: this.configService.get<string>('app.name'),
      env: this.configService.get<'development' | 'production' | 'test'>('app.env'),
      port: this.configService.get<number>('app.port'),
      globalPrefix: this.configService.get<string>('app.globalPrefix')
    };
  }

  get jwt(): JwtConfig {
    return {
      secret: this.configService.getOrThrow<string>('JWT_SECRET'),
      expiresIn: this.configService.get<string>('JWT_EXPIRES_IN', '7d')
    };
  }

  // Convenience methods
  isDevelopment(): boolean {
    return this.app.env === 'development';
  }

  isProduction(): boolean {
    return this.app.env === 'production';
  }
}

// Usage with type safety
@Injectable()
export class DatabaseService {
  constructor(private config: TypedConfigService) {}

  async connect() {
    const dbConfig = this.config.database;  // Fully typed!
    
    console.log(\`Connecting to \${dbConfig.host}:\${dbConfig.port}/\${dbConfig.name}\`);
    // dbConfig.host is string
    // dbConfig.port is number
    // Full IntelliSense support!
  }
}

@Injectable()
export class AuthService {
  constructor(private config: TypedConfigService) {}

  getJwtOptions() {
    const jwtConfig = this.config.jwt;  // Fully typed!
    
    return {
      secret: jwtConfig.secret,      // string
      expiresIn: jwtConfig.expiresIn // string
    };
  }
}`,
      tags: ['config', 'typescript', 'type-safety'],
      explanation: 'Create type-safe configuration wrapper for better DX and fewer errors'
    }
  ],
  
  bestPractices: [
    {
      category: 'Configuration Setup',
      do: [
        {
          title: 'Make ConfigModule global',
          description: 'Set isGlobal: true to avoid importing in every module',
          code: `ConfigModule.forRoot({
  isGlobal: true,  // Available everywhere
  envFilePath: '.env'
})`
        },
        {
          title: 'Use environment-specific files',
          description: 'Load different configurations for different environments',
          code: `ConfigModule.forRoot({
  envFilePath: [
    '.env',
    \`.env.\${process.env.NODE_ENV}\`,
    '.env.local'
  ]
})`
        },
        {
          title: 'Validate configuration on startup',
          description: 'Catch configuration errors early with validation',
          code: `ConfigModule.forRoot({
  validationSchema: configValidationSchema,
  validationOptions: { abortEarly: false }
})`
        }
      ],
      dont: [
        {
          title: 'Don\'t hardcode sensitive values',
          description: 'Always use environment variables for secrets',
          code: `// Don't do this
const JWT_SECRET = 'hardcoded-secret-key';

// Do this
const JWT_SECRET = this.configService.get('JWT_SECRET');`
        },
        {
          title: 'Don\'t commit .env files',
          description: 'Add .env to .gitignore to avoid leaking secrets',
          code: `# .gitignore
.env
.env.local
.env.*.local`
        },
        {
          title: 'Don\'t skip validation in production',
          description: 'Always validate configuration in all environments',
          code: `// Don't skip validation
ConfigModule.forRoot({
  envFilePath: '.env'
  // No validation!
});

// Always validate
ConfigModule.forRoot({
  envFilePath: '.env',
  validationSchema: schema
});`
        }
      ]
    },
    {
      category: 'Accessing Configuration',
      do: [
        {
          title: 'Provide default values',
          description: 'Use defaults to prevent undefined values',
          code: `const port = this.configService.get<number>('PORT', 3000);
const timeout = this.configService.get<number>('TIMEOUT', 5000);`
        },
        {
          title: 'Use getOrThrow for required values',
          description: 'Fail fast if critical config is missing',
          code: `const apiKey = this.configService.getOrThrow<string>('API_KEY');
const dbUrl = this.configService.getOrThrow<string>('DATABASE_URL');`
        },
        {
          title: 'Use type parameters for type safety',
          description: 'Specify types to get IntelliSense and type checking',
          code: `const port = this.configService.get<number>('PORT', 3000);
const enabled = this.configService.get<boolean>('FEATURE_ENABLED', false);`
        }
      ],
      dont: [
        {
          title: 'Don\'t access process.env directly',
          description: 'Use ConfigService for consistency and testability',
          code: `// Don't do this
const port = process.env.PORT;

// Do this
const port = this.configService.get('PORT');`
        },
        {
          title: 'Don\'t ignore missing required config',
          description: 'Use getOrThrow or validation to catch errors',
          code: `// Don't do this
const apiKey = this.configService.get('API_KEY');
// apiKey could be undefined!

// Do this
const apiKey = this.configService.getOrThrow('API_KEY');`
        },
        {
          title: 'Don\'t skip type conversions',
          description: 'Environment variables are always strings',
          code: `// Don't do this
const port = this.configService.get('PORT');
// port is a string!

// Do this
const port = this.configService.get<number>('PORT', 3000);
// Or convert explicitly
const port = parseInt(this.configService.get('PORT'), 10);`
        }
      ]
    },
    {
      category: 'Configuration Organization',
      do: [
        {
          title: 'Use configuration factories',
          description: 'Organize related config into factory functions',
          code: `// database.config.ts
export default () => ({
  database: {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT, 10)
  }
});`
        },
        {
          title: 'Use dot notation for nested config',
          description: 'Structure configuration hierarchically',
          code: `const host = this.configService.get('database.host');
const port = this.configService.get('database.port');`
        },
        {
          title: 'Create typed config wrappers',
          description: 'Wrap ConfigService for better type safety',
          code: `@Injectable()
export class TypedConfigService {
  constructor(private config: ConfigService) {}
  
  get database(): DatabaseConfig {
    return {
      host: this.config.get('DB_HOST'),
      port: this.config.get<number>('DB_PORT')
    };
  }
}`
        }
      ],
      dont: [
        {
          title: 'Don\'t create flat, unorganized config',
          description: 'Use nested structures for clarity',
          code: `// Don't do this
DB_HOST=localhost
DB_PORT=5432
DB_NAME=myapp
REDIS_HOST=localhost
REDIS_PORT=6379

// Do this (in config factory)
{
  database: { host, port, name },
  redis: { host, port }
}`
        },
        {
          title: 'Don\'t mix concerns in config files',
          description: 'Separate config by domain (database, cache, auth)',
          code: `// Don't mix everything
export default () => ({
  dbHost: '...',
  redisPort: 6379,
  jwtSecret: '...'
});

// Separate by concern
export const databaseConfig = () => ({ ... });
export const redisConfig = () => ({ ... });
export const authConfig = () => ({ ... });`
        }
      ]
    }
  ],
  
  troubleshooting: [
    {
      issue: 'Environment variables not loading',
      symptoms: [
        'ConfigService returns undefined',
        '.env file not being read',
        'Variables work in terminal but not in app'
      ],
      solution: 'Check .env file path and ensure it\'s in the correct location',
      code: `// Make sure .env is in project root
ConfigModule.forRoot({
  envFilePath: '.env'  // Relative to project root
})

// Or use absolute path
ConfigModule.forRoot({
  envFilePath: path.resolve(__dirname, '../.env')
})

// Check if file exists
const fs = require('fs');
if (!fs.existsSync('.env')) {
  console.error('.env file not found!');
}`
    },
    {
      issue: 'ConfigService is undefined / Cannot inject',
      symptoms: [
        'Cannot inject ConfigService',
        'ConfigService is undefined in constructor',
        'Dependency injection error'
      ],
      solution: 'Ensure ConfigModule is imported and set as global',
      code: `// Make ConfigModule global
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true  // Makes it available everywhere
    })
  ]
})
export class AppModule {}

// Or import in each module
@Module({
  imports: [ConfigModule],
  providers: [MyService]
})
export class MyModule {}`
    },
    {
      issue: 'Validation errors on startup',
      symptoms: [
        'Application fails to start',
        'Validation error messages',
        'Missing required configuration'
      ],
      solution: 'Check that all required environment variables are set',
      code: `// Check validation schema
export const validationSchema = Joi.object({
  DATABASE_URL: Joi.string().required(),  // Required!
  API_KEY: Joi.string().required()        // Required!
});

// Make sure .env has required values
DATABASE_URL=mongodb://localhost:27017/myapp
API_KEY=your-api-key

// Or provide defaults
DATABASE_URL: Joi.string().default('mongodb://localhost:27017/myapp')`
    },
    {
      issue: 'Type coercion issues',
      symptoms: [
        'Port is a string instead of number',
        'Boolean values are strings',
        'Type mismatches in configuration'
      ],
      solution: 'Explicitly convert types when getting config values',
      code: `// Environment variables are always strings!
const port = this.configService.get('PORT');
console.log(typeof port); // "string"

// Convert explicitly
const port = parseInt(this.configService.get('PORT'), 10);
// Or use type parameter with default
const port = this.configService.get<number>('PORT', 3000);

// Boolean values
const enabled = this.configService.get('FEATURE_ENABLED') === 'true';
// Or in config factory
export default () => ({
  featureEnabled: process.env.FEATURE_ENABLED === 'true'
});`
    },
    {
      issue: 'Configuration not updating / Cached values',
      symptoms: [
        'Config changes not reflected',
        'Old values persisting',
        'Need to restart app for changes'
      ],
      solution: 'ConfigService caches values - restart app or use set() for runtime changes',
      code: `// Config is loaded once at startup
// Changes to .env require app restart

// For runtime changes, use set()
this.configService.set('DYNAMIC_VALUE', newValue);

// Or reload in development
if (process.env.NODE_ENV === 'development') {
  // Watch .env file and reload
  fs.watch('.env', () => {
    console.log('.env changed - restart app');
  });
}`
    }
  ],
  
  relatedPackages: ['@nl-framework/core', '@nl-framework/platform'],
  
  changelog: [
    {
      version: '1.0.0',
      changes: [
        'Initial release with ConfigModule and ConfigService',
        'Support for .env files and environment variables',
        'Configuration factories for structured config',
        'Joi validation support',
        'Nested configuration with dot notation',
        'Multiple environment files support'
      ]
    }
  ]
};
