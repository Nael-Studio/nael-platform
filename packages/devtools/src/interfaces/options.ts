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
  /**
   * Per-type instrumentation ring-buffer capacities for the request debugger.
   * Defaults: 500 requests / 4000 steps / 2000 queries / 500 exceptions /
   * 5000 logs / 2000 cache events.
   */
  bufferSizes?: Partial<DevtoolsBufferSizes>;
  /**
   * Extra key substrings whose values are redacted in the Config panel (and any
   * future body capture), on top of the built-in set (`password`, `token`,
   * `secret`, `authorization`, …). Matched case-insensitively as substrings.
   */
  redactKeys?: string[];
  /**
   * Opt in to reading ONE document per model (and live collection stats) for the
   * Models tab's *sampled schema* view. Off by default — it touches the database.
   */
  sampleDocuments?: boolean;
}

export interface DevtoolsBufferSizes {
  requests: number;
  steps: number;
  queries: number;
  exceptions: number;
  logs: number;
  cache: number;
}

export interface NormalizedDevtoolsOptions {
  enabled: boolean;
  allowInProduction: boolean;
  basePath: string;
  title: string;
  maxSamples: number;
  streamIntervalMs: number;
  bufferSizes: Partial<DevtoolsBufferSizes>;
  redactKeys: string[];
  sampleDocuments: boolean;
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
