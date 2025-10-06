import type { PackageDocumentation } from '../../types';

export const authDocumentation: PackageDocumentation = {
  name: '@nl-framework/auth',
  version: '0.1.0',
  description:
    'Authentication toolkit built around Better Auth. Ships with HTTP routes, guards, middleware, and GraphQL helpers for session-aware applications.',
  installation: 'bun add @nl-framework/auth better-auth',
  features: [
    {
      title: 'HTTP Routes',
      description: 'Register pre-built Better Auth HTTP endpoints (sign up, session, passwordless) with one helper.',
      icon: '🛡️',
    },
    {
      title: 'GraphQL Integration',
      description: 'Directive-based auth controls and field-level guard helpers for resolvers.',
      icon: '🔗',
    },
    {
      title: 'Strategy Extensibility',
      description: 'Plug in custom adapters or extend existing providers through dependency injection.',
      icon: '🧱',
    },
  ],
  quickStart: {
    description: 'Mount Better Auth HTTP routes and secure a controller with the session guard.',
    steps: [
      'Configure Better Auth with providers and session storage.',
      'Call `registerBetterAuthHttpRoutes` inside the HTTP module setup.',
      'Apply `SessionGuard` or GraphQL directives to protect resources.',
    ],
    code: `import { Module } from '@nl-framework/core';
import { registerBetterAuthHttpRoutes, SessionGuard, AuthModule } from '@nl-framework/auth';
import { Controller, Get, UseGuards } from '@nl-framework/http';

@Controller('/profile')
@UseGuards(SessionGuard)
class ProfileController {
  @Get('/')
  me() {
    return { message: 'Secure profile payload' };
  }
}

@Module({
  imports: [AuthModule.forRoot({
    providers: ['email'],
  })],
  controllers: [ProfileController],
})
export class AppModule {
  constructor() {
    registerBetterAuthHttpRoutes();
  }
}
`,
  },
  api: {
    decorators: [
      {
        name: '@AuthUser',
        signature: '@AuthUser(): ParameterDecorator',
        description: 'Inject the authenticated Better Auth user into controllers or resolvers.',
      },
    ],
    classes: [
      {
        name: 'SessionGuard',
        description: 'HTTP guard that validates the Better Auth session token and populates the request context.',
        methods: [
          {
            name: 'canActivate',
            signature: 'canActivate(context: RequestContext): Promise<boolean>',
            description: 'Return `true` when a valid session exists, otherwise throw an HTTP exception.',
          },
        ],
      },
    ],
  },
  examples: [
    {
      title: 'GraphQL Auth Directive',
      description: 'Protect a GraphQL field using the provided `@requireAuth` directive.',
      code: `type Query {
  viewer: User @requireAuth
}
`,
    },
  ],
  bestPractices: [
    {
      category: 'Session Management',
      do: [
        {
          title: 'Rotate session keys regularly',
          description: 'Provide new secrets in Better Auth configuration and roll sessions without downtime.',
        },
      ],
      dont: [
        {
          title: 'Expose auth errors directly',
          description: 'Throw sanitized HTTP exceptions to avoid leaking implementation details.',
        },
      ],
    },
  ],
  troubleshooting: [
    {
      issue: 'Session token rejected',
      symptoms: ['401 unauthenticated response'],
      solution:
        'Confirm the Better Auth instance uses the same secret used on the client and that cookies are forwarded when using proxies.',
    },
  ],
  relatedPackages: ['@nl-framework/http', '@nl-framework/graphql', '@nl-framework/logger'],
};
