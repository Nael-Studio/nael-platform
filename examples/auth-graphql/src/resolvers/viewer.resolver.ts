import { Resolver, Query, Context } from '@nl-framework/graphql';
import { UseGuards } from '@nl-framework/http';
import { AuthGuard, Public } from '@nl-framework/auth';
import type { BetterAuthSessionPayload } from '@nl-framework/auth';
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
    if (!session) {
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
