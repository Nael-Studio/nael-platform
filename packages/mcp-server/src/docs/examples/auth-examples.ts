import type { ExampleCatalogEntry } from '../../types';

export const authExamples: ExampleCatalogEntry[] = [
  {
    id: 'auth-http-session',
    category: 'auth',
    title: 'Session-Protected Route',
    description: 'Protect an HTTP route using the Better Auth guard and return the active user.',
    code: `import { Controller, Get, UseGuards } from '@nl-framework/http';
import { AuthGuard, getRequestAuth } from '@nl-framework/auth';

@Controller('/account')
export class AccountController {
  @Get('/')
  @UseGuards(AuthGuard)
  me(context) {
    return getRequestAuth(context)?.user;
  }
}
`,
    tags: ['auth', 'http'],
    relatedPackages: ['@nl-framework/auth', '@nl-framework/http'],
  },
  {
    id: 'auth-http-multi-tenant',
    category: 'auth',
    title: 'Multi-tenant HTTP guard',
    description: 'Resolve tenant from a header and protect a controller using the multi-tenant guard.',
    code: `import { Controller, Get, UseGuards } from '@nl-framework/http';
import { MultiTenantAuthGuard, getRequestAuth } from '@nl-framework/auth';

@Controller('/profile')
@UseGuards(MultiTenantAuthGuard)
export class ProfileController {
  @Get('/')
  me(context) {
    return {
      tenant: context.request.headers.get('x-tenant-id') ?? 'default',
      auth: getRequestAuth(context),
    };
  }
}
// In bootstrap: registerMultiTenantAuthGuard() and httpApp.use(createBetterAuthMultiTenantMiddleware(...));`,
    tags: ['auth', 'http', 'multi-tenant'],
    relatedPackages: ['@nl-framework/auth', '@nl-framework/http'],
  },
];
