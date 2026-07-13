import { Injectable } from '@nl-framework/core';
import type { ScheduleType, ScheduledHandle } from './types';

type JobMap = Map<string, ScheduledHandle>;

const asReadonly = (map: JobMap): ReadonlyMap<string, ScheduledHandle> => map;

/** Static description of a registered job (its schedule), for introspection. */
export interface JobDescription {
  id: string;
  type: ScheduleType;
  /** Cron expression, interval ms, or timeout ms, formatted for display. */
  schedule: string;
  timezone?: string;
  maxRuns?: number;
}

/** Rolling run-history for a job — updated each execution. */
export interface JobRunState {
  runCount: number;
  running: boolean;
  lastRunAt?: number;
  lastDurationMs?: number;
  lastError?: string;
  /** Best-effort next fire time (interval/timeout only; cron is worker-owned). */
  nextRunAt?: number;
}

/** Combined snapshot used by tooling (devtools scheduler panel). */
export interface SchedulerJobSnapshot extends JobDescription, JobRunState {}

@Injectable()
export class SchedulerRegistry {
  private readonly cronJobs: JobMap = new Map();
  private readonly intervalJobs: JobMap = new Map();
  private readonly timeoutJobs: JobMap = new Map();
  private readonly descriptions = new Map<string, JobDescription>();
  private readonly runStates = new Map<string, JobRunState>();

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

  /** Record a job's static schedule so introspection can list it. */
  describeJob(description: JobDescription): void {
    this.descriptions.set(description.id, description);
    if (!this.runStates.has(description.id)) {
      this.runStates.set(description.id, { runCount: 0, running: false });
    }
  }

  /** Mark a job as running (start of an execution). */
  recordRunStart(id: string, at: number): void {
    const state = this.runStates.get(id) ?? { runCount: 0, running: false };
    state.running = true;
    state.lastRunAt = at;
    this.runStates.set(id, state);
  }

  /** Record the outcome of an execution (duration + optional error). */
  recordRunEnd(id: string, durationMs: number, error?: string, nextRunAt?: number): void {
    const state = this.runStates.get(id) ?? { runCount: 0, running: false };
    state.running = false;
    state.runCount += 1;
    state.lastDurationMs = durationMs;
    state.lastError = error;
    state.nextRunAt = nextRunAt;
    this.runStates.set(id, state);
  }

  getRunState(id: string): JobRunState | undefined {
    return this.runStates.get(id);
  }

  /** Full snapshot of every registered job: schedule + rolling run history. */
  getJobSnapshots(): SchedulerJobSnapshot[] {
    return [...this.descriptions.values()].map((description) => ({
      ...description,
      ...(this.runStates.get(description.id) ?? { runCount: 0, running: false }),
    }));
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
    this.descriptions.clear();
    this.runStates.clear();
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
