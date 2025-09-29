import { Controller } from '@nl-framework/core';
import { Get, type RequestContext } from '@nl-framework/http';
import { getRequestAuth } from '@nl-framework/auth';

@Controller('profile')
export class ProfileController {
  @Get()
  async profile(context: RequestContext) {
    const snapshot = getRequestAuth(context);

    if (!snapshot) {
      return new Response(JSON.stringify({ message: 'Unauthorized' }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }

    return {
      user: snapshot.user,
      session: {
        token: snapshot.session.token,
        expiresAt: snapshot.session.expiresAt,
      },
    };
  }
}
