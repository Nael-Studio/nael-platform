import { DiscoveryService } from '@nl-framework/core';
import { registerHttpRouteRegistrar, type HttpRouteRegistrationApi } from '@nl-framework/http';
import { DEVTOOLS_OPTIONS } from '../constants';
import type { NormalizedDevtoolsOptions } from '../interfaces/options';
import { evaluateGuard } from '../options';
import { buildSystemGraph } from '../introspection/graph';
import { buildModelCatalog } from '../introspection/models';
import { getMetricsCollector } from '../metrics/collector';
import { installMetricsInterceptors } from '../metrics/interceptors';
import { createMetricsSseResponse } from '../metrics/sse';
import { renderDashboardHtml } from './dashboard-html';

let registered = false;

const jsonResponse = (payload: unknown): Response =>
  new Response(JSON.stringify(payload), {
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });

const mountRoutes = async (api: HttpRouteRegistrationApi): Promise<void> => {
  let options: NormalizedDevtoolsOptions;
  try {
    options = await api.resolve<NormalizedDevtoolsOptions>(DEVTOOLS_OPTIONS);
  } catch {
    // Options provider absent — the module was not actually installed. Nothing to mount.
    return;
  }

  const decision = evaluateGuard(options);
  if (!decision.armed) {
    api.logger.info(`[devtools] dashboard not mounted: ${decision.reason}`);
    return;
  }

  if (options.allowInProduction) {
    api.logger.warn(
      '[devtools] dashboard armed in PRODUCTION via allowInProduction — this exposes internal system introspection. Disable it for real production traffic.',
    );
  }

  const { basePath } = options;
  const discovery = await api.resolve(DiscoveryService);

  const collector = getMetricsCollector();
  collector.configure(options.maxSamples);
  installMetricsInterceptors();

  api.registerRoute('GET', basePath, () =>
    new Response(renderDashboardHtml({ basePath, title: options.title }), {
      headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' },
    }),
  );

  api.registerRoute('GET', `${basePath}/api/graph`, () => jsonResponse(buildSystemGraph(discovery)));
  api.registerRoute('GET', `${basePath}/api/models`, () => jsonResponse(buildModelCatalog()));
  api.registerRoute('GET', `${basePath}/api/metrics`, () => jsonResponse(collector.snapshot(Date.now())));
  api.registerRoute('GET', `${basePath}/api/metrics/stream`, () =>
    createMetricsSseResponse(collector, options.streamIntervalMs),
  );

  api.logger.info(`[devtools] dashboard mounted at ${basePath} (live metrics + graph + models)`);
};

/**
 * Register the devtools route registrar once (idempotent). The authoritative
 * enable/disable + production guard runs inside, at mount time, so it holds for
 * both `forRoot` and `forRootAsync` regardless of when options resolve.
 */
export const ensureDevtoolsIntegration = (): void => {
  if (registered) {
    return;
  }
  registered = true;
  registerHttpRouteRegistrar(mountRoutes);
};

/** Test-only: reset the idempotent registration flag. */
export const resetDevtoolsIntegrationForTests = (): void => {
  registered = false;
};
