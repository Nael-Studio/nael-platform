import { Controller } from '@nl-framework/core';
import { Get, type RequestContext } from '@nl-framework/http';
import { getRequestAuth, type BetterAuthSessionPayload } from '@nl-framework/auth';

type SessionSnapshot = BetterAuthSessionPayload & {
  session: {
    token?: string | null;
    expiresAt?: string | number | Date | null;
    [key: string]: unknown;
  };
};

const hasSessionDetails = (
  snapshot: BetterAuthSessionPayload | null,
): snapshot is SessionSnapshot =>
  Boolean(
    snapshot &&
      'session' in snapshot &&
      typeof (snapshot as { session?: unknown }).session === 'object' &&
      (snapshot as { session?: unknown }).session !== null,
  );

@Controller('profile')
export class ProfileController {
  @Get()
  async profile(context: RequestContext) {
    const snapshot = getRequestAuth(context);

    if (!hasSessionDetails(snapshot)) {
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
