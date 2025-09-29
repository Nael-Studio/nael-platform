import { Controller } from '@nl-framework/core';
import { Get, type RequestContext } from '@nl-framework/http';
import { BetterAuthService, getRequestAuth } from '@nl-framework/auth';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: BetterAuthService) {}

  @Get('session')
  async getSession(context: RequestContext) {
    const snapshot = getRequestAuth(context) ?? (await this.authService.getSessionOrNull(context.request));

    if (!snapshot) {
      return {
        authenticated: false,
        session: null,
        user: null,
      };
    }

    return {
      authenticated: true,
      session: snapshot.session,
      user: snapshot.user,
    };
  }
}
