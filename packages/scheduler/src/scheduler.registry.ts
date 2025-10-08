import { Injectable } from '@nl-framework/core';
import type { ScheduledHandle } from './types';

type JobMap = Map<string, ScheduledHandle>;

const asReadonly = (map: JobMap): ReadonlyMap<string, ScheduledHandle> => map;

@Injectable()
export class SchedulerRegistry {
  private readonly cronJobs: JobMap = new Map();
  private readonly intervalJobs: JobMap = new Map();
  private readonly timeoutJobs: JobMap = new Map();

  registerCronJob(id: string, handle: ScheduledHandle): void {
    this.register(this.cronJobs, id, handle);
  }

  registerInterval(id: string, handle: ScheduledHandle): void {
    this.register(this.intervalJobs, id, handle);
  }

  registerTimeout(id: string, handle: ScheduledHandle): void {
    this.register(this.timeoutJobs, id, handle);
  }

  getCronJob(id: string): ScheduledHandle | undefined {
    return this.cronJobs.get(id);
  }

  getInterval(id: string): ScheduledHandle | undefined {
    return this.intervalJobs.get(id);
  }

  getTimeout(id: string): ScheduledHandle | undefined {
    return this.timeoutJobs.get(id);
  }

  getCronJobs(): ReadonlyMap<string, ScheduledHandle> {
    return asReadonly(this.cronJobs);
  }

  getIntervals(): ReadonlyMap<string, ScheduledHandle> {
    return asReadonly(this.intervalJobs);
  }

  getTimeouts(): ReadonlyMap<string, ScheduledHandle> {
    return asReadonly(this.timeoutJobs);
  }

  removeCronJob(id: string): boolean {
    return this.remove(this.cronJobs, id);
  }

  removeInterval(id: string): boolean {
    return this.remove(this.intervalJobs, id);
  }

  removeTimeout(id: string): boolean {
    return this.remove(this.timeoutJobs, id);
  }

  clear(): void {
    for (const handle of [...this.cronJobs.values()]) {
      handle.cancel();
    }
    for (const handle of [...this.intervalJobs.values()]) {
      handle.cancel();
    }
    for (const handle of [...this.timeoutJobs.values()]) {
      handle.cancel();
    }

    this.cronJobs.clear();
    this.intervalJobs.clear();
    this.timeoutJobs.clear();
  }

  private register(map: JobMap, id: string, handle: ScheduledHandle): void {
    if (map.has(id)) {
      throw new Error(`Job with id "${id}" already registered.`);
    }

    map.set(id, handle);
  }

  private remove(map: JobMap, id: string): boolean {
    return map.delete(id);
  }
}
