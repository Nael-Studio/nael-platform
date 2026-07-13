import { Resolver, Query, Context } from '@nl-framework/graphql';
import { UseGuards } from '@nl-framework/http';
import { AuthGuard, RolesGuard, Roles, Public } from '@nl-framework/auth';
import type { BetterAuthSessionPayload } from '@nl-framework/auth';
import { Viewer } from '../models/viewer.model';
import type { AuthenticatedGraphqlContext } from '../types';

type SessionWithUser = BetterAuthSessionPayload & {
  user: {
    id: string;
    email?: string | null;
    name?: string | null;
    emailVerified?: boolean;
    [key: string]: unknown;
  };
};

// Guard order matters: AuthGuard authenticates first and attaches the principal,
// then RolesGuard enforces `@Roles`/`@Permissions`.
@Resolver(() => Viewer)
@UseGuards(AuthGuard, RolesGuard)
export class ViewerResolver {
  @Public()
  @Query(() => String, { description: 'Health check that remains publicly accessible.' })
  health(): string {
    return 'Auth GraphQL example online';
  }

  @Query(() => Viewer, { description: 'Information about the authenticated user derived from the Better Auth session.' })
  viewer(@Context() context: AuthenticatedGraphqlContext): Viewer {
    // AuthGuard guarantees a principal here, so `context.auth` is always present.
    const session = context.auth as SessionWithUser;

    return {
      id: session.user.id,
      email: session.user.email ?? null,
      name: session.user.name ?? null,
      emailVerified: Boolean(session.user.emailVerified),
    } satisfies Viewer;
  }

  // Only principals resolving to the `admin` role reach this field; everyone else
  // gets a FORBIDDEN error from RolesGuard — no in-resolver role check required.
  @Roles('admin')
  @Query(() => String, { description: 'Admin-only greeting, gated by @Roles("admin").' })
  adminGreeting(@Context() context: AuthenticatedGraphqlContext): string {
    const session = context.auth as SessionWithUser;
    return `Welcome, administrator ${session.user.email ?? session.user.id}.`;
  }
}
