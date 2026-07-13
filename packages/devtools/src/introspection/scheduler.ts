import type { SchedulerJobSnapshot } from '@nl-framework/scheduler';

export interface SchedulerReport {
  /** False when the scheduler package/registry is not present in the app. */
  available: boolean;
  jobs: SchedulerJobSnapshot[];
  stats: {
    jobs: number;
    running: number;
    failing: number;
  };
}

/**
 * Shape the registry's job snapshots for the Scheduler panel. `jobs === undefined`
 * means the scheduler isn't installed, which the panel renders as an empty state
 * rather than an error.
 */
export const buildSchedulerReport = (jobs: SchedulerJobSnapshot[] | undefined): SchedulerReport => {
  const list = jobs ?? [];
  return {
    available: jobs !== undefined,
    jobs: [...list].sort((a, b) => a.id.localeCompare(b.id)),
    stats: {
      jobs: list.length,
      running: list.filter((job) => job.running).length,
      failing: list.filter((job) => Boolean(job.lastError)).length,
    },
  };
};
