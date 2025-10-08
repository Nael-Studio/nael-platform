import { Module } from '@nl-framework/core';
import { SchedulerRegistry } from './scheduler.registry';
import { SchedulerService } from './scheduler.service';
import { defaultSchedulerWorkerFactoryProvider } from './worker-factory';

@Module({
  providers: [SchedulerRegistry, SchedulerService, defaultSchedulerWorkerFactoryProvider],
  exports: [SchedulerRegistry, SchedulerService],
})
export class SchedulerModule {}
