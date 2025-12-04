import { Resolver, Query, Context } from '@nl-framework/graphql';
import { UseGuards } from '@nl-framework/http';
import { AuthGuard, Public } from '@nl-framework/auth';
import type { BetterAuthSessionPayload } from '@nl-framework/auth';
type SessionWithUser = BetterAuthSessionPayload & {
  user: {
    id: string;
    email?: string | null;
    name?: string | null;
    emailVerified?: boolean;
    [key: string]: unknown;
  };
};

const hasUserProfile = (
  session: BetterAuthSessionPayload | null | undefined,
): session is SessionWithUser => {
  if (!session || typeof session !== 'object' || session === null) {
    return false;
  }

  const user = (session as { user?: unknown }).user;
  return typeof user === 'object' && user !== null && typeof (user as { id?: unknown }).id === 'string';
};
import { Viewer } from '../models/viewer.model';
import type { AuthenticatedGraphqlContext } from '../types';

@Resolver(() => Viewer)
@UseGuards(AuthGuard)
export class ViewerResolver {
  @Public()
  @Query(() => String, { description: 'Health check that remains publicly accessible.' })
  health(): string {
    return 'Auth GraphQL example online';
  }

  @Query(() => Viewer, { description: 'Information about the authenticated user derived from the Better Auth session.' })
  viewer(@Context() context: AuthenticatedGraphqlContext): Viewer {
    const session: BetterAuthSessionPayload | null | undefined = context.auth;
    if (!hasUserProfile(session)) {
      throw new Error('No Better Auth session present in context. Ensure you are signed in.');
    }

    return {
      id: session.user.id,
      email: session.user.email ?? null,
      name: session.user.name ?? null,
      emailVerified: Boolean(session.user.emailVerified),
    } satisfies Viewer;
  }
}
