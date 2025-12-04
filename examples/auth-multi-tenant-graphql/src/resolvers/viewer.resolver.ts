import { UseGuards } from '@nl-framework/http';
import { Context, Public, Query, Resolver } from '@nl-framework/graphql';
import {
  MultiTenantAuthGuard,
  BetterAuthMultiTenantService,
  type BetterAuthSessionPayload,
} from '@nl-framework/auth';
import { Viewer } from '../models/viewer.model';
import type { AuthenticatedGraphqlContext } from '../types';

@Resolver(() => Viewer)
@UseGuards(MultiTenantAuthGuard)
export class ViewerResolver {
  constructor(private readonly authService: BetterAuthMultiTenantService) {}

  @Public()
  @Query(() => String)
  health(): string {
    return 'Auth multi-tenant GraphQL example online';
  }

  @Query(() => Viewer)
  async viewer(@Context() context: AuthenticatedGraphqlContext): Promise<Viewer> {
    const request = (context as { req?: Request }).req as Request | undefined;
    const tenant = request?.headers.get('x-tenant-id') ?? 'default';
    const session: BetterAuthSessionPayload | null | undefined =
      context.auth ??
      (request
        ? await this.authService.getSessionOrNull(request, {
            request,
            headers: request.headers,
            graphqlContext: context,
          })
        : null);

    if (!session) {
      return {
        tenant,
        authenticated: false,
        email: null,
        name: null,
      };
    }

    return {
      tenant,
      authenticated: true,
      email: session.user.email ?? null,
      name: session.user.name ?? null,
    };
  }
}
