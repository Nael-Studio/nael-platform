import { Module, type ClassType, type Provider, isInjectable } from '@nl-framework/core';
import { SchedulerRegistry } from './scheduler.registry';
import { SchedulerService } from './scheduler.service';
import { defaultSchedulerWorkerFactoryProvider } from './worker-factory';

type SchedulerClass = ClassType & { name?: string };

@Module({
  providers: [SchedulerRegistry, SchedulerService, defaultSchedulerWorkerFactoryProvider],
  exports: [SchedulerRegistry, SchedulerService],
})
export class SchedulerModule {
  static forFeature(schedulers: ClassType | ClassType[]): ClassType {
    const schedulerClasses = (Array.isArray(schedulers) ? schedulers : [schedulers]).filter(
      Boolean,
    ) as SchedulerClass[];

    if (schedulerClasses.length === 0) {
      throw new Error('SchedulerModule.forFeature requires at least one scheduler class.');
    }

    for (const schedulerClass of schedulerClasses) {
      const schedulerName = schedulerClass?.name ?? 'AnonymousScheduler';
      if (!isInjectable(schedulerClass)) {
        throw new Error(
          `SchedulerModule.forFeature expected ${schedulerName} to be annotated with @Injectable().`,
        );
      }
    }

    const uniqueSchedulers: SchedulerClass[] = [];
    const seen = new Set<SchedulerClass>();
    for (const schedulerClass of schedulerClasses) {
      if (!seen.has(schedulerClass)) {
        seen.add(schedulerClass);
        uniqueSchedulers.push(schedulerClass);
      }
    }

    const bootstrapProviders: Provider[] = uniqueSchedulers.map((schedulerClass) => ({
      provide: Symbol(`SchedulerBootstrap:${schedulerClass.name ?? 'AnonymousScheduler'}`),
      useFactory: (scheduler: object) => scheduler,
      inject: [schedulerClass],
    }));

    @Module({
      imports: [SchedulerModule],
      providers: [...uniqueSchedulers, ...bootstrapProviders],
      exports: [SchedulerRegistry, SchedulerService, ...uniqueSchedulers],
      bootstrap: uniqueSchedulers,
    })
    class SchedulerFeatureModule {}

    return SchedulerFeatureModule;
  }
}
