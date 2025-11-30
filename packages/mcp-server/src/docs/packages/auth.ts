import type { PackageDocumentation } from '../../types';

export const authDocumentation: PackageDocumentation = {
  name: '@nl-framework/auth',
  version: '0.2.17',
  description:
    'Authentication toolkit built around Better Auth. Ships with HTTP routes, guards, middleware, GraphQL helpers, and multi-tenant utilities for session-aware applications.',
  installation: 'bun add @nl-framework/auth better-auth',
  features: [
    {
      title: 'HTTP Routes',
      description: 'Register pre-built Better Auth HTTP endpoints (sign up, session, passwordless) with one helper.',
      icon: '🛡️',
    },
    {
      title: 'GraphQL Integration',
      description: 'Guard-based GraphQL integration plus a GraphQL proxy for the native Better Auth API.',
      icon: '🔗',
    },
    {
      title: 'Multi-tenant',
      description: 'Resolve tenants per request, hydrate Better Auth options from a store, and isolate cookies per tenant.',
      icon: '🏢',
    },
  ],
  quickStart: {
    description: 'Mount Better Auth HTTP routes and secure a controller with the auth guard.',
    steps: [
      'Configure Better Auth with providers and database adapter.',
      'Import `BetterAuthHttpModule.register({ prefix: "/api/auth" })` to expose native routes.',
      'Apply `AuthGuard` (HTTP/GraphQL) or middleware to protect resources.',
    ],
    code: `import { Module } from '@nl-framework/core';
import { BetterAuthModule, BetterAuthHttpModule, AuthGuard } from '@nl-framework/auth';
import { Controller, Get, UseGuards } from '@nl-framework/http';

@Controller('/profile')
@UseGuards(AuthGuard)
class ProfileController {
  @Get('/')
  me() {
    return { message: 'Secure profile payload' };
  }
}

@Module({
  imports: [
    BetterAuthModule.forRoot({
      betterAuth: {
        secret: process.env.BETTER_AUTH_SECRET!,
        emailAndPassword: { enabled: true },
      },
      database: /* adapter factory here */,
    }),
    BetterAuthHttpModule.register({ prefix: '/api/auth' }),
  ],
  controllers: [ProfileController],
})
export class AppModule {}
`,
  },
  api: {
    decorators: [],
    classes: [
      {
        name: 'AuthGuard',
        description:
          'HTTP/GraphQL guard that resolves Better Auth sessions and populates the request or GraphQL context.',
        methods: [
          {
            name: 'canActivate',
            signature: 'canActivate(context: HttpExecutionContext | GraphqlExecutionContext): Promise<GuardDecision>',
            description: 'Return `true` when a valid session exists, otherwise return a 401 response.',
          },
        ],
      },
      {
        name: 'MultiTenantAuthGuard',
        description: 'Multi-tenant variant that resolves the tenant per request and checks the matching Better Auth instance.',
        methods: [
          {
            name: 'canActivate',
            signature: 'canActivate(context: HttpExecutionContext | GraphqlExecutionContext): Promise<GuardDecision>',
            description: 'Resolves tenant, hydrates session for that tenant, and authorizes the request.',
          },
        ],
      },
      {
        name: 'BetterAuthMultiTenantService',
        description:
          'Creates and caches Better Auth instances per tenant using a resolver + loader (e.g., DB-backed configs).',
        methods: [
          {
            name: 'getInstance',
            signature: 'getInstance(context: BetterAuthTenantContext): Promise<BetterAuthInstance>',
            description: 'Resolves tenant and returns (or initializes) the Better Auth instance for that tenant.',
          },
          {
            name: 'getSessionOrNull',
            signature:
              'getSessionOrNull(input: Request | Headers, context?: BetterAuthTenantContext, options?): Promise<BetterAuthSessionPayload | null>',
            description: 'Fetches the Better Auth session for the resolved tenant without throwing.',
          },
        ],
      },
    ],
    functions: [
      {
        name: 'createBetterAuthMiddleware',
        signature: 'createBetterAuthMiddleware(service: BetterAuthService, options?): MiddlewareHandler',
        description: 'HTTP middleware that resolves a session and optionally attaches it to the request context.',
      },
      {
        name: 'createBetterAuthMultiTenantMiddleware',
        signature:
          'createBetterAuthMultiTenantMiddleware(service: BetterAuthMultiTenantService, options?): MiddlewareHandler',
        description: 'Multi-tenant HTTP middleware that resolves tenant + session per request.',
      },
      {
        name: 'registerBetterAuthHttpRoutes',
        signature: 'registerBetterAuthHttpRoutes(service: BetterAuthService, options: NormalizedBetterAuthHttpOptions)',
        description: 'Registers native Better Auth HTTP routes for single-tenant setups.',
      },
      {
        name: 'registerBetterAuthMultiTenantHttpRoutes',
        signature:
          'registerBetterAuthMultiTenantHttpRoutes(service: BetterAuthMultiTenantService, options: NormalizedBetterAuthHttpOptions, bootstrapTenant: BetterAuthTenantResolution)',
        description:
          'Registers native Better Auth HTTP routes for multi-tenant setups (bootstrap tenant used to read API registry).',
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
    {
      title: 'Multi-tenant HTTP guard + middleware',
      description: 'Resolve tenant from a header and protect a controller.',
      code: `import { Controller, Get, UseGuards } from '@nl-framework/http';
import { MultiTenantAuthGuard, createBetterAuthMultiTenantMiddleware } from '@nl-framework/auth';

@Controller('/profile')
@UseGuards(MultiTenantAuthGuard)
class ProfileController {
  @Get('/')
  me(@Context() ctx) {
    return ctx.auth;
  }
}
// In bootstrap: httpApp.use(createBetterAuthMultiTenantMiddleware(authService));`,
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
        {
          title: 'Isolate tenant cookies',
          description: 'Set unique cookie prefixes/domains per tenant via Better Auth advanced options or deriveCookiePrefix.',
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
        'Confirm the Better Auth instance uses the same secret used on the client and that cookies are forwarded when using proxies. In multi-tenant setups, ensure the correct tenant is resolved and cookies use tenant-specific prefixes/domains.',
    },
  ],
  relatedPackages: ['@nl-framework/http', '@nl-framework/graphql', '@nl-framework/logger'],
};
