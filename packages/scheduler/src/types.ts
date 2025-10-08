import type { ClassType } from '@nl-framework/core';

export type ScheduleType = 'cron' | 'interval' | 'timeout';

type BaseScheduleOptions = {
  /**
   * Logical name for the task. Defaults to ClassName#methodName.
   */
  name?: string;
  /**
   * Whether to invoke the handler immediately after registration.
   */
  runOnInit?: boolean;
  /**
   * Maximum number of executions before automatically cancelling the task.
   */
  maxRuns?: number;
};

export interface CronOptions extends BaseScheduleOptions {
  cron: string;
  timezone?: string;
}

export interface IntervalOptions extends BaseScheduleOptions {
  interval: number;
}

export interface TimeoutOptions extends BaseScheduleOptions {
  timeout: number;
}

export type ScheduleOptions = CronOptions | IntervalOptions | TimeoutOptions;

export type CronDecoratorOptions = Omit<CronOptions, 'cron'>;
export type IntervalDecoratorOptions = Omit<IntervalOptions, 'interval'>;
export type TimeoutDecoratorOptions = Omit<TimeoutOptions, 'timeout'>;

export interface SchedulerTaskMetadataBase<TType extends ScheduleType, TOptions extends ScheduleOptions> {
  type: TType;
  propertyKey: string | symbol;
  options: TOptions;
}

export type CronTaskMetadata = SchedulerTaskMetadataBase<'cron', CronOptions>;
export type IntervalTaskMetadata = SchedulerTaskMetadataBase<'interval', IntervalOptions>;
export type TimeoutTaskMetadata = SchedulerTaskMetadataBase<'timeout', TimeoutOptions>;

export type SchedulerTaskMetadata = CronTaskMetadata | IntervalTaskMetadata | TimeoutTaskMetadata;

export type SchedulerHandler = () => void | Promise<void>;

export interface ScheduledHandle {
  id: string;
  type: ScheduleType;
  cancel(): void | Promise<void>;
}

