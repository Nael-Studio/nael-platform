import { Controller } from '@nl-framework/core';
import { Get } from '@nl-framework/http';

@Controller()
export class RootController {
  @Get()
  index() {
    return {
      message: 'Better Auth HTTP Example',
      endpoints: {
        session: '/auth/session',
        profile: '/profile',
        authApi: '/api/auth/*',
      },
      docs: 'Use the Better Auth client to hit /api/auth routes for sign-in and session management.',
    };
  }
}
