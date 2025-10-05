import { PackageDocumentation } from '../../types.js';

export const httpPackageDocs: PackageDocumentation = {
  name: '@nl-framework/http',
  version: '1.0.0',
  description: 'Modern HTTP server framework with decorators for building REST APIs. Includes routing, middleware, validation, and error handling.',

  installation: 'bun add @nl-framework/http @nl-framework/core',

  features: [
    {
      title: 'Decorator-Based Routing',
      description: 'Define routes using intuitive decorators like @Get, @Post, @Put, @Delete',
      icon: '🎯'
    },
    {
      title: 'Built-in Validation',
      description: 'Automatic request validation with class-validator integration',
      icon: '✅'
    },
    {
      title: 'Middleware Support',
      description: 'Global, controller-level, and route-level middleware',
      icon: '🔗'
    },
    {
      title: 'Exception Filters',
      description: 'Centralized error handling with custom exception filters',
      icon: '🛡️'
    },
    {
      title: 'Request/Response',
      description: 'Access to request and response objects via decorators',
      icon: '📡'
    },
    {
      title: 'CORS Support',
      description: 'Built-in CORS configuration for cross-origin requests',
      icon: '🌐'
    }
  ],

  quickStart: {
    description: 'Create a simple REST API controller',
    steps: [
      'Install dependencies: bun add @nl-framework/http @nl-framework/core',
      'Create a controller with @Controller decorator',
      'Add route handlers with @Get, @Post, etc.',
      'Register controller in a module',
      'Create app with NaelFactory'
    ],
    code: `import { Injectable } from '@nl-framework/core';
import { Controller, Get, Post, Body } from '@nl-framework/http';

@Injectable()
@Controller('/users')
export class UserController {
  @Get()
  findAll() {
    return { users: [] };
  }

  @Post()
  create(@Body() userData: any) {
    return { id: 1, ...userData };
  }
}`
  },

  api: {
    decorators: [
      {
        name: 'Controller',
        signature: '@Controller(prefix?: string)',
        parameters: [
          {
            name: 'prefix',
            type: 'string',
            description: 'Base path for all routes in this controller',
            required: false
          }
        ],
        description: 'Marks a class as a REST API controller',
        examples: [
          '@Controller()',
          '@Controller(\'/api/users\')',
          '@Controller(\'/v1/products\')'
        ],
        package: '@nl-framework/http'
      },
      {
        name: 'Get',
        signature: '@Get(path?: string)',
        parameters: [
          {
            name: 'path',
            type: 'string',
            description: 'Route path relative to controller prefix',
            required: false
          }
        ],
        description: 'Defines a GET route handler',
        examples: [
          '@Get()',
          '@Get(\':id\')',
          '@Get(\'search\')'
        ],
        package: '@nl-framework/http'
      },
      {
        name: 'Post',
        signature: '@Post(path?: string)',
        parameters: [
          {
            name: 'path',
            type: 'string',
            description: 'Route path relative to controller prefix',
            required: false
          }
        ],
        description: 'Defines a POST route handler',
        examples: [
          '@Post()',
          '@Post(\'bulk\')',
          '@Post(\'import\')'
        ],
        package: '@nl-framework/http'
      },
      {
        name: 'Put',
        signature: '@Put(path?: string)',
        parameters: [
          {
            name: 'path',
            type: 'string',
            description: 'Route path relative to controller prefix',
            required: false
          }
        ],
        description: 'Defines a PUT route handler',
        examples: [
          '@Put(\':id\')',
          '@Put(\'batch\')'
        ],
        package: '@nl-framework/http'
      },
      {
        name: 'Delete',
        signature: '@Delete(path?: string)',
        parameters: [
          {
            name: 'path',
            type: 'string',
            description: 'Route path relative to controller prefix',
            required: false
          }
        ],
        description: 'Defines a DELETE route handler',
        examples: [
          '@Delete(\':id\')',
          '@Delete(\'all\')'
        ],
        package: '@nl-framework/http'
      },
      {
        name: 'Body',
        signature: '@Body(key?: string)',
        parameters: [
          {
            name: 'key',
            type: 'string',
            description: 'Specific property from request body',
            required: false
          }
        ],
        description: 'Injects request body or specific property',
        examples: [
          '@Body()',
          '@Body(\'email\')',
          '@Body(\'user.name\')'
        ],
        package: '@nl-framework/http'
      },
      {
        name: 'Param',
        signature: '@Param(key?: string)',
        parameters: [
          {
            name: 'key',
            type: 'string',
            description: 'Route parameter name',
            required: false
          }
        ],
        description: 'Injects route parameter(s)',
        examples: [
          '@Param()',
          '@Param(\'id\')',
          '@Param(\'userId\')'
        ],
        package: '@nl-framework/http'
      },
      {
        name: 'Query',
        signature: '@Query(key?: string)',
        parameters: [
          {
            name: 'key',
            type: 'string',
            description: 'Query parameter name',
            required: false
          }
        ],
        description: 'Injects query parameter(s)',
        examples: [
          '@Query()',
          '@Query(\'page\')',
          '@Query(\'filter\')'
        ],
        package: '@nl-framework/http'
      },
      {
        name: 'Headers',
        signature: '@Headers(key?: string)',
        parameters: [
          {
            name: 'key',
            type: 'string',
            description: 'Header name',
            required: false
          }
        ],
        description: 'Injects request header(s)',
        examples: [
          '@Headers()',
          '@Headers(\'authorization\')',
          '@Headers(\'content-type\')'
        ],
        package: '@nl-framework/http'
      },
      {
        name: 'UseGuards',
        signature: '@UseGuards(...guards: Type<Guard>[])',
        parameters: [
          {
            name: 'guards',
            type: 'Type<Guard>[]',
            description: 'Guard classes to apply',
            required: true
          }
        ],
        description: 'Applies guards to controller or route',
        examples: [
          '@UseGuards(AuthGuard)',
          '@UseGuards(RoleGuard, ThrottleGuard)'
        ],
        package: '@nl-framework/http'
      },
      {
        name: 'UseInterceptors',
        signature: '@UseInterceptors(...interceptors: Type<Interceptor>[])',
        parameters: [
          {
            name: 'interceptors',
            type: 'Type<Interceptor>[]',
            description: 'Interceptor classes to apply',
            required: true
          }
        ],
        description: 'Applies interceptors to controller or route',
        examples: [
          '@UseInterceptors(LoggingInterceptor)',
          '@UseInterceptors(CacheInterceptor, TransformInterceptor)'
        ],
        package: '@nl-framework/http'
      }
    ],

    classes: [
      {
        name: 'HttpException',
        description: 'Base exception class for HTTP errors',
        package: '@nl-framework/http',
        constructor: {
          parameters: [
            {
              name: 'message',
              type: 'string',
              description: 'Error message'
            },
            {
              name: 'status',
              type: 'number',
              description: 'HTTP status code'
            }
          ]
        },
        methods: [
          {
            name: 'getStatus',
            signature: 'getStatus(): number',
            description: 'Returns HTTP status code',
            returns: 'number'
          },
          {
            name: 'getMessage',
            signature: 'getMessage(): string',
            description: 'Returns error message',
            returns: 'string'
          }
        ],
        examples: [
          'throw new HttpException(\'User not found\', HttpStatus.NOT_FOUND)',
          'throw new HttpException(\'Invalid data\', HttpStatus.BAD_REQUEST)'
        ]
      },
      {
        name: 'HttpStatus',
        description: 'Enum with standard HTTP status codes',
        package: '@nl-framework/http',
        constructor: {},
        methods: [
          {
            name: 'OK',
            signature: 'HttpStatus.OK',
            description: '200 status code',
            returns: 'number'
          },
          {
            name: 'CREATED',
            signature: 'HttpStatus.CREATED',
            description: '201 status code',
            returns: 'number'
          },
          {
            name: 'BAD_REQUEST',
            signature: 'HttpStatus.BAD_REQUEST',
            description: '400 status code',
            returns: 'number'
          },
          {
            name: 'UNAUTHORIZED',
            signature: 'HttpStatus.UNAUTHORIZED',
            description: '401 status code',
            returns: 'number'
          },
          {
            name: 'FORBIDDEN',
            signature: 'HttpStatus.FORBIDDEN',
            description: '403 status code',
            returns: 'number'
          },
          {
            name: 'NOT_FOUND',
            signature: 'HttpStatus.NOT_FOUND',
            description: '404 status code',
            returns: 'number'
          },
          {
            name: 'INTERNAL_SERVER_ERROR',
            signature: 'HttpStatus.INTERNAL_SERVER_ERROR',
            description: '500 status code',
            returns: 'number'
          }
        ],
        examples: [
          'HttpStatus.OK',
          'HttpStatus.NOT_FOUND',
          'HttpStatus.INTERNAL_SERVER_ERROR'
        ]
      }
    ],

    interfaces: [
      {
        name: 'HttpModuleOptions',
        description: 'Configuration options for HTTP module',
        properties: [
          {
            name: 'port',
            type: 'number',
            description: 'Server port',
            required: false
          },
          {
            name: 'host',
            type: 'string',
            description: 'Server host',
            required: false
          },
          {
            name: 'cors',
            type: 'boolean | CorsOptions',
            description: 'CORS configuration',
            required: false
          },
          {
            name: 'bodyLimit',
            type: 'number',
            description: 'Max request body size in bytes',
            required: false
          },
          {
            name: 'globalPrefix',
            type: 'string',
            description: 'Global route prefix',
            required: false
          }
        ],
        package: '@nl-framework/http'
      }
    ]
  },

  examples: [
    {
      title: 'Basic CRUD Controller',
      description: 'Complete CRUD operations with validation',
      code: `import { Injectable } from '@nl-framework/core';
import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete,
  Body,
  Param,
  Query,
  HttpException,
  HttpStatus
} from '@nl-framework/http';

interface CreateUserDto {
  email: string;
  name: string;
  age: number;
}

@Injectable()
@Controller('/users')
export class UserController {
  private users: any[] = [];

  @Get()
  async findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10
  ) {
    const start = (page - 1) * limit;
    return {
      data: this.users.slice(start, start + limit),
      page,
      limit,
      total: this.users.length
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const user = this.users.find(u => u.id === id);
    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }
    return user;
  }

  @Post()
  async create(@Body() dto: CreateUserDto) {
    const user = {
      id: String(Date.now()),
      ...dto,
      createdAt: new Date()
    };
    this.users.push(user);
    return user;
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: Partial<CreateUserDto>
  ) {
    const index = this.users.findIndex(u => u.id === id);
    if (index === -1) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }
    this.users[index] = { ...this.users[index], ...dto };
    return this.users[index];
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    const index = this.users.findIndex(u => u.id === id);
    if (index === -1) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }
    this.users.splice(index, 1);
    return { message: 'User deleted' };
  }
}`,
      explanation: 'This example shows a complete CRUD controller with pagination, error handling, and proper HTTP status codes.',
      tags: ['crud', 'controller', 'validation', 'error-handling']
    },
    {
      title: 'Middleware Usage',
      description: 'Custom middleware for logging and authentication',
      code: `import { Injectable, NaelMiddleware } from '@nl-framework/core';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggingMiddleware implements NaelMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    console.log(\`[\${new Date().toISOString()}] \${req.method} \${req.url}\`);
    next();
  }
}

@Injectable()
export class AuthMiddleware implements NaelMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const token = req.headers.authorization;
    if (!token) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    // Verify token logic here
    next();
  }
}

// Apply middleware in module
import { Module, MiddlewareConsumer } from '@nl-framework/core';
import { UserController } from './user.controller';

@Module({
  controllers: [UserController],
  providers: [LoggingMiddleware, AuthMiddleware]
})
export class UserModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(LoggingMiddleware)
      .forRoutes('*')
      .apply(AuthMiddleware)
      .forRoutes(UserController);
  }
}`,
      explanation: 'Demonstrates creating and applying middleware at different levels.',
      tags: ['middleware', 'logging', 'authentication']
    },
    {
      title: 'Exception Filter',
      description: 'Custom exception filter for error handling',
      code: `import { Injectable, ExceptionFilter, Catch } from '@nl-framework/core';
import { HttpException, HttpStatus } from '@nl-framework/http';
import { Request, Response } from 'express';

@Injectable()
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, req: Request, res: Response) {
    const status = exception.getStatus();
    const message = exception.getMessage();

    res.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: req.url,
      message
    });
  }
}

// Global exception filter
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, req: Request, res: Response) {
    const status = exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const message = exception instanceof Error
      ? exception.message
      : 'Internal server error';

    res.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: req.url,
      message,
      stack: process.env.NODE_ENV === 'development' 
        ? (exception as Error).stack 
        : undefined
    });
  }
}

// Register in main.ts
import { NaelFactory } from '@nl-framework/platform';
import { AppModule } from './app.module';

const app = await NaelFactory.create(AppModule);
app.useGlobalFilters(new AllExceptionsFilter());
await app.listen();`,
      explanation: 'Shows how to create custom exception filters for centralized error handling.',
      tags: ['error-handling', 'exception-filter', 'middleware']
    },
    {
      title: 'File Upload',
      description: 'Handle file uploads with multipart/form-data',
      code: `import { Injectable } from '@nl-framework/core';
import { 
  Controller, 
  Post, 
  UseInterceptors,
  UploadedFile,
  UploadedFiles
} from '@nl-framework/http';
import { FileInterceptor, FilesInterceptor } from '@nl-framework/http/multer';

@Injectable()
@Controller('/upload')
export class UploadController {
  
  @Post('single')
  @UseInterceptors(FileInterceptor('file'))
  uploadFile(@UploadedFile() file: Express.Multer.File) {
    return {
      message: 'File uploaded successfully',
      filename: file.filename,
      size: file.size,
      mimetype: file.mimetype
    };
  }

  @Post('multiple')
  @UseInterceptors(FilesInterceptor('files', 10))
  uploadFiles(@UploadedFiles() files: Express.Multer.File[]) {
    return {
      message: 'Files uploaded successfully',
      count: files.length,
      files: files.map(f => ({
        filename: f.filename,
        size: f.size
      }))
    };
  }
}`,
      explanation: 'Demonstrates single and multiple file upload handling.',
      tags: ['file-upload', 'multipart', 'interceptor']
    }
  ],

  bestPractices: [
    {
      category: 'Controller Design',
      do: [
        {
          title: 'Keep controllers thin',
          description: 'Move business logic to services',
          code: `@Controller('/users')
export class UserController {
  constructor(private userService: UserService) {}
  
  @Get()
  findAll() {
    return this.userService.findAll();
  }
}`
        },
        {
          title: 'Use DTOs for type safety',
          description: 'Define clear interfaces for request/response',
          code: `interface CreateUserDto {
  email: string;
  name: string;
}

@Post()
create(@Body() dto: CreateUserDto) {
  return this.userService.create(dto);
}`
        }
      ],
      dont: [
        {
          title: 'Put business logic in controllers',
          description: 'Controllers should only handle HTTP concerns',
          code: `@Post()
create(@Body() dto: any) {
  // DON'T: Business logic in controller
  const user = { ...dto, id: uuid() };
  database.users.insert(user);
  return user;
}`
        }
      ]
    },
    {
      category: 'Error Handling',
      do: [
        {
          title: 'Use HttpException with proper status codes',
          description: 'Throw exceptions with meaningful messages',
          code: `if (!user) {
  throw new HttpException(
    'User not found', 
    HttpStatus.NOT_FOUND
  );
}`
        },
        {
          title: 'Use exception filters for consistency',
          description: 'Centralize error response formatting'
        }
      ],
      dont: [
        {
          title: 'Return error responses directly',
          description: 'Let exception filters handle error formatting',
          code: `// DON'T
return { error: true, message: 'Not found' };`
        }
      ]
    },
    {
      category: 'Validation',
      do: [
        {
          title: 'Use validation decorators on DTOs',
          description: 'Leverage class-validator for automatic validation',
          code: `import { IsEmail, IsString, MinLength } from 'class-validator';

class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(2)
  name: string;
}`
        }
      ],
      dont: [
        {
          title: 'Manual validation in controllers',
          description: 'Let the framework handle validation',
          code: `// DON'T
@Post()
create(@Body() dto: any) {
  if (!dto.email || !dto.name) {
    throw new HttpException('Invalid data', 400);
  }
}`
        }
      ]
    }
  ],

  troubleshooting: [
    {
      issue: 'Cannot find decorator metadata',
      symptoms: [
        'TypeError: Cannot read property \'length\' of undefined',
        'Reflect.getMetadata returns undefined'
      ],
      solution: 'Enable decorator metadata in tsconfig.json',
      code: `{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}`,
      relatedTopics: ['decorators', 'typescript', 'configuration']
    },
    {
      issue: 'CORS errors in browser',
      symptoms: [
        'Access-Control-Allow-Origin header missing',
        'CORS policy blocked request'
      ],
      solution: 'Enable CORS in HttpModule configuration',
      code: `HttpModule.forRoot({
  port: 3000,
  cors: {
    origin: 'http://localhost:5173',
    credentials: true
  }
})`,
      relatedTopics: ['cors', 'security', 'configuration']
    },
    {
      issue: 'Request body is undefined',
      symptoms: [
        '@Body() returns undefined',
        'req.body is empty'
      ],
      solution: 'Ensure body parser middleware is enabled (enabled by default)',
      code: `// If disabled, re-enable:
HttpModule.forRoot({
  bodyParser: true,
  bodyLimit: 1024 * 1024 // 1MB
})`,
      relatedTopics: ['middleware', 'body-parser', 'request']
    },
    {
      issue: 'Route not found (404)',
      symptoms: [
        'Cannot GET /api/users',
        '404 Not Found'
      ],
      solution: 'Check controller registration and route paths',
      code: `// 1. Verify controller is registered in module
@Module({
  controllers: [UserController]
})

// 2. Check route paths
@Controller('/api/users') // Base path
@Get() // Full path: GET /api/users
findAll() { }`,
      relatedTopics: ['routing', 'controllers', 'modules']
    }
  ],

  relatedPackages: ['@nl-framework/core', '@nl-framework/platform', '@nl-framework/auth'],

  changelog: [
    {
      version: '1.0.0',
      changes: [
        'Initial release',
        'Controller decorators (@Controller, @Get, @Post, etc.)',
        'Parameter decorators (@Body, @Param, @Query, etc.)',
        'Middleware support',
        'Exception filters',
        'CORS support'
      ]
    }
  ]
};
