import {
  CronDecoratorOptions,
  IntervalDecoratorOptions,
  TimeoutDecoratorOptions,
  CronTaskMetadata,
  IntervalTaskMetadata,
  TimeoutTaskMetadata,
  SchedulerTaskMetadata,
} from '../types';
import { addSchedulerMetadata } from '../metadata';

const ensurePositiveNumber = (value: number, label: string): void => {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${label} must be a non-negative finite number.`);
  }
};

const applyDefaultName = <TMetadata extends SchedulerTaskMetadata>(
  target: object,
  propertyKey: string | symbol,
  metadata: TMetadata,
): TMetadata => {
  const name = metadata.options.name;
  if (name && name.trim().length > 0) {
    return metadata;
  }

  const className = target.constructor?.name ?? 'AnonymousClass';
  return {
    ...metadata,
    options: {
      ...metadata.options,
      name: `${className}#${String(propertyKey)}`,
    },
  };
};

const guardHandler = (
  target: object,
  propertyKey: string | symbol,
  descriptor: PropertyDescriptor,
): void => {
  if (!propertyKey || !descriptor || typeof descriptor.value !== 'function') {
    throw new Error('Scheduler decorators can only be applied to methods.');
  }
};

export const Cron = (expression: string, options: CronDecoratorOptions = {}): MethodDecorator =>
  (target, propertyKey, descriptor) => {
    guardHandler(target, propertyKey, descriptor);

    if (typeof expression !== 'string' || expression.trim() === '') {
      throw new Error('@Cron requires a non-empty cron expression.');
    }

    const metadata: CronTaskMetadata = {
      type: 'cron',
      propertyKey,
      options: {
        cron: expression,
        ...options,
      },
    };

    addSchedulerMetadata(target, applyDefaultName(target, propertyKey, metadata));
  };

export const Interval = (intervalMs: number, options: IntervalDecoratorOptions = {}): MethodDecorator =>
  (target, propertyKey, descriptor) => {
    guardHandler(target, propertyKey, descriptor);
    ensurePositiveNumber(intervalMs, 'Interval');

    const metadata: IntervalTaskMetadata = {
      type: 'interval',
      propertyKey,
      options: {
        interval: intervalMs,
        ...options,
      },
    };

    addSchedulerMetadata(target, applyDefaultName(target, propertyKey, metadata));
  };

export const Timeout = (timeoutMs: number, options: TimeoutDecoratorOptions = {}): MethodDecorator =>
  (target, propertyKey, descriptor) => {
    guardHandler(target, propertyKey, descriptor);
    ensurePositiveNumber(timeoutMs, 'Timeout');

    const metadata: TimeoutTaskMetadata = {
      type: 'timeout',
      propertyKey,
      options: {
        timeout: timeoutMs,
        ...options,
      },
    };

    addSchedulerMetadata(target, applyDefaultName(target, propertyKey, metadata));
  };
