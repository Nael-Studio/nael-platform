import 'reflect-metadata';
import { SCHEDULER_METADATA_KEY } from './constants';
import type { SchedulerTaskMetadata } from './types';
import type { ClassType } from '@nl-framework/core';

export const addSchedulerMetadata = (target: object, metadata: SchedulerTaskMetadata): void => {
  const ctor = typeof target === 'function' ? (target as ClassType) : (target.constructor as ClassType);
  const existing = (Reflect.getMetadata(SCHEDULER_METADATA_KEY, ctor) as SchedulerTaskMetadata[]) ?? [];
  Reflect.defineMetadata(SCHEDULER_METADATA_KEY, [...existing, metadata], ctor);
};

export const getSchedulerMetadata = (ctor: ClassType): SchedulerTaskMetadata[] => {
  return ((Reflect.getMetadata(SCHEDULER_METADATA_KEY, ctor) as SchedulerTaskMetadata[]) ?? []).slice();
};
