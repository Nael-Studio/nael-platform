import type { Token } from '@nl-framework/core';

export type HealthStatus = 'up' | 'down';

export interface HealthResult {
  status: HealthStatus;
  details?: Record<string, unknown>;
}

/**
 * A single health check. Custom indicators are any provider implementing this
 * interface — registered via the `indicators` array or the `@HealthIndicator()`
 * class decorator (discovered through core's `DiscoveryService`).
 */
export interface HealthIndicator {
  readonly name: string;
  check(): Promise<HealthResult>;
}

/** Resolution surface handed to built-in indicators at bind (boot) time. */
export interface HealthCheckContext {
  /** Optional resolution — returns `undefined` instead of throwing when absent. */
  resolve<T>(token: Token<T>): Promise<T | undefined>;
}

/**
 * Built-in indicators implement this to receive DI access once, at boot. Custom
 * indicators (DI providers) get their dependencies via constructor injection and
 * do not need it.
 */
export interface BindableHealthIndicator extends HealthIndicator {
  bind(context: HealthCheckContext): Promise<void> | void;
}

export const isBindableIndicator = (
  indicator: HealthIndicator,
): indicator is BindableHealthIndicator =>
  typeof (indicator as BindableHealthIndicator).bind === 'function';

/** Aggregate readiness report. */
export interface HealthReport {
  status: 'ok' | 'error';
  checks: Record<string, HealthResult>;
}

export interface HealthModuleOptions {
  /** Liveness route — 200 while the process is up, 503 once shutdown begins. Default `/healthz`. */
  path?: string;
  /** Readiness route — runs the indicators. Default `/readyz`. Pass `false` to disable. */
  readinessPath?: string | false;
  /** Indicators to run for readiness. */
  indicators?: HealthIndicator[];
  /** Per-indicator timeout in milliseconds. Default `3000`. */
  timeoutMs?: number;
}

export interface NormalizedHealthOptions {
  path: string;
  readinessPath: string | false;
  indicators: HealthIndicator[];
  timeoutMs: number;
}
