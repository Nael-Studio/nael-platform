import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import 'reflect-metadata';
import { Application, Controller, Injectable, LazyModuleLoader, Module } from '../src';

@Injectable()
class ReportsService {
  getName(): string {
    return 'reports';
  }
}

@Controller('reports')
class ReportsController {
  constructor(private readonly reports: ReportsService) { }

  summary() {
    return this.reports.getName();
  }
}

@Module({
  providers: [ReportsService],
  controllers: [ReportsController],
  exports: [ReportsService],
})
class ReportsModule { }

@Injectable()
class AnalyticsService {
  getName(): string {
    return 'analytics';
  }
}

@Controller('analytics')
class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) { }

  summary() {
    return this.analytics.getName();
  }
}

@Module({
  providers: [AnalyticsService],
  controllers: [AnalyticsController],
  exports: [AnalyticsService],
})
class AnalyticsModule { }

@Module({})
class AppModule { }

describe('LazyModuleLoader', () => {
  let app: Application;

  beforeEach(() => {
    app = new Application();
  });

  afterEach(async () => {
    await app.close();
  });

  it('loads modules on demand and instantiates controllers', async () => {
    const context = await app.bootstrap(AppModule);
    const loader = await context.get(LazyModuleLoader);

    expect(context.getControllers()).toHaveLength(0);

    const result = await loader.load(ReportsModule);
    expect(result.module).toBe(ReportsModule);
    const controllers = context.getControllers<object>();
    expect(controllers).toHaveLength(1);
    expect(((controllers[0] ?? {}) as { constructor?: Function }).constructor).toBe(ReportsController);
  });

  it('supports async factories and notifies listeners', async () => {
    const context = await app.bootstrap(AppModule);
    const loader = await context.get(LazyModuleLoader);
    const events: string[] = [];

    const unsubscribe = context.addModuleLoadListener(({ module }) => {
      events.push(module.name ?? 'AnonymousModule');
    });

    const result = await loader.load(async () => ({ default: AnalyticsModule }));
    expect(result.module).toBe(AnalyticsModule);

    const controllers = context.getControllers<object>();
    expect(
      controllers.some(
        (controller) => ((controller ?? {}) as { constructor?: Function }).constructor === AnalyticsController,
      ),
    ).toBe(true);
    expect(events).toContain('AnalyticsModule');

    unsubscribe();
  });
});
