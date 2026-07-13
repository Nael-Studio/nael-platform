import { Controller } from '@nl-framework/core';
import { Get, type RequestContext } from '@nl-framework/http';
import { Roles, Permissions, getRequestAuth } from '@nl-framework/auth';

/**
 * Demonstrates first-party RBAC. `AuthGuard` runs first (authenticating the
 * request), then `RolesGuard` enforces these declarative requirements — no
 * hand-rolled `if (user.role !== 'admin')` checks needed.
 */
@Controller('admin')
@Roles('admin')
export class AdminController {
  // Inherits the class-level `@Roles('admin')`.
  @Get()
  dashboard(context: RequestContext) {
    const snapshot = getRequestAuth(context);
    return { area: 'admin-dashboard', user: snapshot?.user ?? null };
  }

  // ALL-of permission requirement stacked on top of the admin role.
  @Permissions('billing:write')
  @Get('billing')
  billing() {
    return { area: 'billing' };
  }
}
