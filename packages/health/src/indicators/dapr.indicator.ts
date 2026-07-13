import type { HealthIndicator, HealthResult } from '../interfaces';

export interface DaprIndicatorOptions {
  /** App id — surfaced in the details for identification. */
  appId?: string;
  /** Sidecar host. Default `127.0.0.1`. */
  host?: string;
  /** Sidecar HTTP port. Default `process.env.DAPR_HTTP_PORT` or `3500`. */
  port?: number;
  /** Health path on the sidecar. Default `/v1.0/healthz`. */
  path?: string;
  /** Per-probe timeout in milliseconds. Default `2000`. */
  timeoutMs?: number;
  /** Override the indicator name (default `dapr`). */
  name?: string;
}

/**
 * Probes the Dapr sidecar's health endpoint (`GET /v1.0/healthz`, which returns
 * 204 when ready). Mirrors the probe used by `DaprTransport.connect()`.
 */
export const daprIndicator = (options: DaprIndicatorOptions = {}): HealthIndicator => {
  const host = options.host ?? '127.0.0.1';
  const port = options.port ?? Number(process.env.DAPR_HTTP_PORT ?? 3500);
  const path = options.path ?? '/v1.0/healthz';
  const timeoutMs = options.timeoutMs ?? 2_000;
  const url = `http://${host}:${port}${path}`;

  return {
    name: options.name ?? 'dapr',
    async check(): Promise<HealthResult> {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      const startedAt = performance.now();
      try {
        const response = await fetch(url, { method: 'GET', signal: controller.signal });
        const latencyMs = Math.round(performance.now() - startedAt);
        const ok = response.ok || response.status === 204;
        return {
          status: ok ? 'up' : 'down',
          details: {
            ...(options.appId ? { appId: options.appId } : {}),
            url,
            httpStatus: response.status,
            latencyMs,
          },
        };
      } catch (error) {
        return {
          status: 'down',
          details: {
            ...(options.appId ? { appId: options.appId } : {}),
            url,
            reason: error instanceof Error ? error.message : String(error),
          },
        };
      } finally {
        clearTimeout(timer);
      }
    },
  };
};
