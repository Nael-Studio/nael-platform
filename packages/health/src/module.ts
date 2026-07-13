import { Module, type ClassType, type Provider } from '@nl-framework/core';
import {
  HEALTH_OPTIONS,
  DEFAULT_LIVENESS_PATH,
  DEFAULT_READINESS_PATH,
  DEFAULT_TIMEOUT_MS,
} from './constants';
import type { HealthModuleOptions, NormalizedHealthOptions } from './interfaces';
import { HealthService } from './health.service';
import { createHealthController } from './health.controller';

const ensureLeadingSlash = (value: string): string =>
  value.startsWith('/') ? value : `/${value}`;

const normalizeOptions = (options: HealthModuleOptions): NormalizedHealthOptions => ({
  path: ensureLeadingSlash(options.path ?? DEFAULT_LIVENESS_PATH),
  readinessPath:
    options.readinessPath === false
      ? false
      : ensureLeadingSlash(options.readinessPath ?? DEFAULT_READINESS_PATH),
  indicators: options.indicators ?? [],
  timeoutMs: options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
});

export class HealthModule {
  /**
   * Register liveness/readiness endpoints. Mounts an internal `@Public()`
   * controller on the existing HTTP router at the configured paths (default
   * `/healthz` and `/readyz`). Indicators run in parallel with a per-indicator
   * timeout; `@HealthIndicator()` providers are discovered automatically.
   */
  static forRoot(options: HealthModuleOptions = {}): ClassType {
    const normalized = normalizeOptions(options);

    const optionsProvider: Provider = {
      provide: HEALTH_OPTIONS,
      useValue: normalized,
    };

    const controller = createHealthController(normalized);

    @Module({
      controllers: [controller],
      providers: [optionsProvider, HealthService],
      exports: [HealthService, HEALTH_OPTIONS],
    })
    class HealthRootModule {}

    return HealthRootModule;
  }
}
