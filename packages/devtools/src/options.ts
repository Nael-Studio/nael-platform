import { DEFAULT_BASE_PATH, DEFAULT_DASHBOARD_TITLE } from './constants';
import type { NaelDevtoolsOptions, NormalizedDevtoolsOptions } from './interfaces/options';

const normalizeBasePath = (basePath?: string): string => {
  if (!basePath) {
    return DEFAULT_BASE_PATH;
  }
  const trimmed = basePath.trim();
  if (!trimmed || trimmed === '/') {
    return DEFAULT_BASE_PATH;
  }
  const withLeading = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  // strip any trailing slash so `${basePath}/api/...` composes cleanly
  return withLeading.endsWith('/') ? withLeading.slice(0, -1) : withLeading;
};

const positiveInt = (value: number | undefined, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;

export const normalizeDevtoolsOptions = (
  options: NaelDevtoolsOptions = {},
): NormalizedDevtoolsOptions => ({
  enabled: options.enabled ?? false,
  allowInProduction: options.allowInProduction ?? false,
  basePath: normalizeBasePath(options.basePath),
  title: options.title?.trim() || DEFAULT_DASHBOARD_TITLE,
  maxSamples: positiveInt(options.maxSamples, 2000),
  streamIntervalMs: positiveInt(options.streamIntervalMs, 2000),
});

export const isProductionEnvironment = (): boolean =>
  (process.env.NODE_ENV ?? '').toLowerCase() === 'production';

export interface GuardDecision {
  armed: boolean;
  reason?: string;
}

/**
 * Decide whether the dashboard may arm. Fail-safe: disabled by default, and
 * blocked in production unless `allowInProduction` is explicitly set. This is
 * the single authoritative gate — the route registrar consults it before
 * mounting anything.
 */
export const evaluateGuard = (options: NormalizedDevtoolsOptions): GuardDecision => {
  if (!options.enabled) {
    return { armed: false, reason: 'disabled (enabled: false)' };
  }
  if (isProductionEnvironment() && !options.allowInProduction) {
    return {
      armed: false,
      reason: 'blocked in production (NODE_ENV=production and allowInProduction is not set)',
    };
  }
  return { armed: true };
};
