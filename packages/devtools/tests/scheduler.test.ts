import { describe, expect, it } from 'bun:test';
import type { SchedulerJobSnapshot } from '@nl-framework/scheduler';
import { buildSchedulerReport } from '../src/introspection/scheduler';
import { renderDashboardHtml } from '../src/http/dashboard-html';

const job = (over: Partial<SchedulerJobSnapshot>): SchedulerJobSnapshot => ({
  id: 'job',
  type: 'interval',
  schedule: 'every 1000ms',
  runCount: 0,
  running: false,
  ...over,
});

describe('buildSchedulerReport', () => {
  it('marks unavailable when the scheduler is absent', () => {
    const report = buildSchedulerReport(undefined);
    expect(report.available).toBe(false);
    expect(report.jobs).toEqual([]);
    expect(report.stats.jobs).toBe(0);
  });

  it('sorts jobs and tallies running / failing counts', () => {
    const report = buildSchedulerReport([
      job({ id: 'b', running: true }),
      job({ id: 'a', lastError: 'boom' }),
      job({ id: 'c', runCount: 3 }),
    ]);

    expect(report.available).toBe(true);
    expect(report.jobs.map((j) => j.id)).toEqual(['a', 'b', 'c']);
    expect(report.stats.jobs).toBe(3);
    expect(report.stats.running).toBe(1);
    expect(report.stats.failing).toBe(1);
  });

  it('renders a Scheduler tab with a run endpoint', () => {
    const html = renderDashboardHtml({ basePath: '/__nael', title: 'Nael DevTools' });
    expect(html).toContain('data-tab="scheduler"');
    expect(html).toContain('id="tab-scheduler"');
    expect(html).toContain('/api/scheduler');
  });
});
