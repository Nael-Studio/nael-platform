import { statfs } from 'node:fs/promises';
import type { HealthIndicator, HealthResult } from '../interfaces';

export interface DiskIndicatorOptions {
  /** Path on the target filesystem (e.g. `/`). */
  path: string;
  /** Fail when free space drops below this many bytes. */
  minFreeBytes: number;
  /** Override the indicator name (default `disk`). */
  name?: string;
}

/** Reports `down` when free space on `path`'s filesystem falls below `minFreeBytes`. */
export const diskIndicator = (options: DiskIndicatorOptions): HealthIndicator => ({
  name: options.name ?? 'disk',
  async check(): Promise<HealthResult> {
    try {
      const stats = await statfs(options.path);
      const freeBytes = stats.bavail * stats.bsize;
      const status = freeBytes >= options.minFreeBytes ? 'up' : 'down';
      return {
        status,
        details: { path: options.path, freeBytes, minFreeBytes: options.minFreeBytes },
      };
    } catch (error) {
      return {
        status: 'down',
        details: {
          path: options.path,
          reason: error instanceof Error ? error.message : String(error),
        },
      };
    }
  },
});
