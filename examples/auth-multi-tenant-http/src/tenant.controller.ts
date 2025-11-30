import { Controller } from '@nl-framework/core';
import { Get, type RequestContext } from '@nl-framework/http';
import { Public } from '@nl-framework/auth';

@Controller('/')
export class TenantController {
  @Public()
  @Get('/')
  async whoAmI(context: RequestContext) {
    const tenant = context.request.headers.get('x-tenant-id') ?? 'default';
    return {
      message: 'Multi-tenant Better Auth HTTP example',
      tenant,
    };
  }
}
