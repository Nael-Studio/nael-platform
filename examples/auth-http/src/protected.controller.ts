import { Controller } from '@nl-framework/core';
import { Get, type RequestContext } from '@nl-framework/http';
import { BetterAuthService, getAuthSessionFromContext, getAuthTokenFromContext } from '@nl-framework/auth';

@Controller()
export class ProtectedController {
  constructor(private readonly authService: BetterAuthService) {}

  @Get('me')
  async getProfile(ctx: RequestContext) {
    const session = getAuthSessionFromContext(ctx);
    if (!session) {
      return new Response(JSON.stringify({ message: 'Unauthorized' }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      });
    }

    const user = await this.authService.getUser(session.userId);
    return Response.json({
      message: 'Authenticated request successful.',
      session: {
        sessionId: session.sessionId,
        expiresAt: session.expiresAt,
        roles: session.roles,
        token: getAuthTokenFromContext(ctx),
      },
      user: user
        ? {
            id: user.id,
            email: user.email,
            roles: user.roles,
          }
        : undefined,
    });
  }

  @Get('admin/insights')
  async getAdminInsights(ctx: RequestContext) {
    const session = getAuthSessionFromContext(ctx);
    if (!session) {
      return new Response(JSON.stringify({ message: 'Unauthorized' }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      });
    }

    return Response.json({
      message: 'Admin-only route accessed successfully.',
      session: {
        userId: session.userId,
        roles: session.roles,
      },
    });
  }
}
