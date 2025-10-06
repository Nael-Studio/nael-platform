import type { ExampleCatalogEntry } from '../../types';

export const authExamples: ExampleCatalogEntry[] = [
  {
    id: 'auth-http-session',
    category: 'auth',
    title: 'Session-Protected Route',
    description: 'Protect an HTTP route using the session guard and return the active user.',
    code: `import { Controller, Get, UseGuards } from '@nl-framework/http';
import { SessionGuard, AuthUser } from '@nl-framework/auth';

@Controller('/account')
export class AccountController {
  @Get('/')
  @UseGuards(SessionGuard)
  me(@AuthUser() user: { id: string; email: string }) {
    return user;
  }
}
`,
    tags: ['auth', 'http'],
    relatedPackages: ['@nl-framework/auth', '@nl-framework/http'],
  },
];
