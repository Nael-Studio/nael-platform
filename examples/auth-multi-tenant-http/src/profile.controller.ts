import { Controller } from '@nl-framework/core';
import { Get, UseGuards, type RequestContext } from '@nl-framework/http';
import {
  MultiTenantAuthGuard,
  BetterAuthMultiTenantService,
  getRequestAuth,
} from '@nl-framework/auth';

@Controller('/profile')
@UseGuards(MultiTenantAuthGuard)
export class ProfileController {
  constructor(private readonly authService: BetterAuthMultiTenantService) {}

  @Get('/')
  async me(context: RequestContext) {
    const snapshot =
      getRequestAuth(context) ??
      (await this.authService.getSessionOrNull(context.request, {
        headers: context.request.headers,
      }));

    if (!snapshot) {
      return { authenticated: false, user: null, session: null };
    }

    return {
      authenticated: true,
      user: snapshot.user,
      session: snapshot.session,
    };
  }
}
