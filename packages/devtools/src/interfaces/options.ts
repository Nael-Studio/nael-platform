import type { ClassType, Token } from '@nl-framework/core';

export interface NaelDevtoolsOptions {
  /**
   * Master switch. Defaults to `false` — when off, the plugin registers no
   * routes and mounts nothing. Turn on only in non-production environments.
   */
  enabled?: boolean;
  /**
   * Escape hatch to allow arming while `NODE_ENV === 'production'`. Defaults to
   * `false`; leaving it false means the dashboard can never be reachable in a
   * production deployment even if `enabled` is accidentally true. Setting it
   * true logs a loud warning.
   */
  allowInProduction?: boolean;
  /** Base path the dashboard + JSON API mount under. Defaults to `/__nael`. */
  basePath?: string;
  /** Title shown in the dashboard shell. Defaults to `Nael DevTools`. */
  title?: string;
  /** Size of the performance ring buffer (samples retained). Defaults to 2000. */
  maxSamples?: number;
  /** SSE push interval for live metrics, in ms. Defaults to 2000. */
  streamIntervalMs?: number;
}

export interface NormalizedDevtoolsOptions {
  enabled: boolean;
  allowInProduction: boolean;
  basePath: string;
  title: string;
  maxSamples: number;
  streamIntervalMs: number;
}

export interface NaelDevtoolsOptionsFactory {
  createDevtoolsOptions(): NaelDevtoolsOptions | Promise<NaelDevtoolsOptions>;
}

export interface NaelDevtoolsAsyncOptions {
  imports?: ClassType[];
  inject?: Token[];
  useFactory?: (...args: unknown[]) => NaelDevtoolsOptions | Promise<NaelDevtoolsOptions>;
  useClass?: ClassType<NaelDevtoolsOptionsFactory>;
  useExisting?: ClassType<NaelDevtoolsOptionsFactory>;
}
