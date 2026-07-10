import { describe, expect, it } from 'bun:test';
import {
  Application,
  Controller,
  DiscoveryService,
  Injectable,
  Module,
  SetMetadata,
} from '../src/index';

const PERMISSIONS_KEY = 'permissions';
const RequirePermission = (permission: string) => SetMetadata(PERMISSIONS_KEY, permission);

@Injectable()
class AuditService {
  record(): string {
    return 'recorded';
  }
}

@Controller('/workflows')
class WorkflowController {
  constructor(private readonly audit: AuditService) {}

  @RequirePermission('workflow:read')
  list(): string[] {
    return [];
  }

  @RequirePermission('workflow:create')
  create(): string {
    return this.audit.record();
  }

  health(): string {
    return 'ok';
  }
}

@RequirePermission('report:read')
@Injectable()
class ReportProvider {}

@Module({
  providers: [AuditService, ReportProvider],
  controllers: [WorkflowController],
})
class DiscoveryTestModule {}

describe('DiscoveryService', () => {
  it('is injectable and enumerates modules, providers, and controllers', async () => {
    const app = new Application();
    const context = await app.bootstrap(DiscoveryTestModule);
    const discovery = await context.get(DiscoveryService);

    expect(discovery).toBeInstanceOf(DiscoveryService);
    expect(discovery.getModules()).toContain(DiscoveryTestModule);
    expect(discovery.getControllerClasses()).toEqual([WorkflowController]);

    const providerNames = discovery.getProviders().map((provider) => provider.name);
    expect(providerNames).toContain('AuditService');
    expect(providerNames).toContain('WorkflowController');

    expect(discovery.getProviderClasses()).toContain(AuditService);
    expect(discovery.getControllers()).toHaveLength(1);

    await app.close();
  });

  it('scans method-level metadata across controllers and providers', async () => {
    const app = new Application();
    const context = await app.bootstrap(DiscoveryTestModule);
    const discovery = await context.get(DiscoveryService);

    const permissions = discovery.methodsWithMetadata<string>(PERMISSIONS_KEY);
    const found = permissions.map(({ metatype, methodName, meta }) => ({
      className: metatype.name,
      methodName,
      meta,
    }));

    expect(found).toContainEqual({
      className: 'WorkflowController',
      methodName: 'list',
      meta: 'workflow:read',
    });
    expect(found).toContainEqual({
      className: 'WorkflowController',
      methodName: 'create',
      meta: 'workflow:create',
    });
    expect(found.some((entry) => entry.methodName === 'health')).toBe(false);

    await app.close();
  });

  it('scans class-level metadata', async () => {
    const app = new Application();
    const context = await app.bootstrap(DiscoveryTestModule);
    const discovery = await context.get(DiscoveryService);

    const classes = discovery.classesWithMetadata<string>(PERMISSIONS_KEY);
    expect(classes).toContainEqual({ metatype: ReportProvider, meta: 'report:read' });
    expect(discovery.getClassMetadata<string>(PERMISSIONS_KEY, ReportProvider)).toBe('report:read');

    await app.close();
  });
});
