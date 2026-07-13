import type { HealthIndicator, HealthResult } from '../interfaces';

export interface MemoryIndicatorOptions {
  /** Fail when resident set size exceeds this many bytes. */
  maxRssBytes: number;
  /** Override the indicator name (default `memory`). */
  name?: string;
}

/** Reports `down` when the process RSS exceeds `maxRssBytes`. */
export const memoryIndicator = (options: MemoryIndicatorOptions): HealthIndicator => ({
  name: options.name ?? 'memory',
  async check(): Promise<HealthResult> {
    const rss = process.memoryUsage().rss;
    const status = rss <= options.maxRssBytes ? 'up' : 'down';
    return {
      status,
      details: { rssBytes: rss, maxRssBytes: options.maxRssBytes },
    };
  },
});
