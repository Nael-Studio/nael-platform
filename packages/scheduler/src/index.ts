import 'reflect-metadata';

export { Cron, Interval, Timeout } from './decorators';
export {
  SchedulerRegistry,
  type JobDescription,
  type JobRunState,
  type SchedulerJobSnapshot,
} from './scheduler.registry';
export { SchedulerService } from './scheduler.service';
export { SchedulerModule } from './module';
export { SCHEDULER_METADATA_KEY, SCHEDULER_WORKER_FACTORY } from './constants';
export { defaultSchedulerWorkerFactoryProvider, DefaultSchedulerWorkerFactory } from './worker-factory';
export type {
  CronOptions,
  IntervalOptions,
  TimeoutOptions,
  SchedulerTaskMetadata,
  ScheduledHandle,
  SchedulerHandler,
} from './types';
export type { SchedulerWorkerFactory, SchedulerWorker } from './worker-factory';
