import type { PackageDocumentation } from '../../types';

export const httpDocumentation: PackageDocumentation = {
  name: '@nl-framework/http',
  version: '0.1.0',
  description:
    'HTTP routing primitives built on top of the core module system. Provides controllers, route decorators, middleware, interceptors, and integration with the platform bootstrap utilities.',
  installation: 'bun add @nl-framework/http',
  features: [
    {
      title: 'Annotation-Based Routing',
      description: 'Decorators such as `@Controller`, `@Get`, `@Post`, and `@UseGuards` make routes explicit and testable.',
      icon: '🛣️',
    },
    {
      title: 'Request Context',
      description: 'Strongly-typed context with params, query, headers, and user state for every handler.',
      icon: '📦',
    },
    {
      title: 'Better Auth Ready',
      description: 'Drop-in integration with the auth package to protect routes via guards or global interceptors.',
      icon: '🔐',
    },
  ],
  quickStart: {
    description: 'Create a REST controller with route handlers and bootstrap it via the platform HTTP adapter.',
    steps: [
      'Annotate a class with `@Controller` to define the route prefix.',
      'Use method decorators (`@Get`, `@Post`, etc.) to implement handlers.',
      'Register the controller inside a module and start the HTTP server through `@nl-framework/platform`.',
    ],
    code: `import { Controller, Get, Post, Body, Param } from '@nl-framework/http';
import { Module } from '@nl-framework/core';
import { bootstrapHttpApplication } from '@nl-framework/platform';

@Controller('/users')
class UsersController {
  private readonly users = new Map<string, { id: string; email: string }>();

  @Get('/')
  list() {
    return Array.from(this.users.values());
  }

  @Get('/:id')
  findOne(@Param('id') id: string) {
    return this.users.get(id);
  }

  @Post('/')
  create(@Body() body: { email: string }) {
    const id = crypto.randomUUID();
    const user = { id, email: body.email };
    this.users.set(id, user);
    return user;
  }
}

@Module({ controllers: [UsersController] })
class AppModule {}

await bootstrapHttpApplication(AppModule, { port: 3000 });
`,
  },
  api: {
    decorators: [
      {
        name: '@Controller',
        signature: '@Controller(prefix?: string): ClassDecorator',
        description: 'Associates a class with a base path for HTTP routing.',
      },
      {
        name: '@Get',
        signature: '@Get(path?: string): MethodDecorator',
        description: 'Register a GET handler with the provided path segment.',
        examples: ['@Get(\'/status\') status() { return { ok: true }; }'],
      },
      {
        name: '@UseGuards',
        signature: '@UseGuards(...guards: GuardType[]): MethodDecorator',
        description: 'Apply request guards for auth or permission checks.',
      },
    ],
    classes: [
      {
        name: 'HttpAdapter',
        description: 'Abstraction implemented by the Platform package to host controllers on Bun HTTP, Express, or custom servers.',
        methods: [
          {
            name: 'registerController',
            signature: 'registerController(controller: ControllerMetadata): void',
            description: 'Mounts controller handler definitions onto the underlying router.',
          },
        ],
      },
    ],
  },
  examples: [
    {
      title: 'Global Exception Filter',
      description: 'Wrap every request in a try/catch and translate errors to problem responses.',
      code: `import { ExceptionFilter, HttpException } from '@nl-framework/http';

export class ProblemJsonFilter implements ExceptionFilter {
  async catch(error: Error) {
    if (error instanceof HttpException) {
      return new Response(JSON.stringify({
        title: error.name,
        detail: error.message,
      }), {
        status: error.status,
        headers: { 'Content-Type': 'application/problem+json' },
      });
    }

    return new Response(JSON.stringify({
      title: 'Internal Server Error',
      detail: error.message,
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/problem+json' },
    });
  }
}
`,
      explanation: 'Register via `app.useGlobalFilters(new ProblemJsonFilter())` during bootstrap to standardize error shape.',
      tags: ['filters', 'error-handling'],
    },
  ],
  bestPractices: [
    {
      category: 'Routing',
      do: [
        {
          title: 'Validate payloads close to the edge',
          description: 'Use pipes or DTO classes to ensure incoming payloads are typed before reaching business logic.',
        },
      ],
      dont: [
        {
          title: 'Avoid heavy logic in controllers',
          description: 'Delegate to services to keep controllers thin and composable.',
        },
      ],
    },
  ],
  troubleshooting: [
    {
      issue: 'Decorator metadata undefined',
      symptoms: ['Controller methods are not invoked', 'Routes resolve to 404'],
      solution:
        'Confirm `reflect-metadata` is imported once at the root of the process and that `emitDecoratorMetadata` is enabled.',
    },
  ],
  relatedPackages: ['@nl-framework/auth', '@nl-framework/platform', '@nl-framework/logger'],
};
