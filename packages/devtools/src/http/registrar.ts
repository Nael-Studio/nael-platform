import { ConfigService, DiscoveryService, getBootReport, registerCacheObserver } from '@nl-framework/core';
import { registerHttpRouteRegistrar, type HttpRouteRegistrationApi } from '@nl-framework/http';
import { Logger, LoggerFactory } from '@nl-framework/logger';
import { registerQueryObserver } from '@nl-framework/orm';
import { DEVTOOLS_OPTIONS } from '../constants';
import type { NormalizedDevtoolsOptions } from '../interfaces/options';
import { evaluateGuard } from '../options';
import { getConnectionToken, type MongoConnection } from '@nl-framework/orm';
import { buildSystemGraph } from '../introspection/graph';
import { buildModelCatalog, findModelByName, readModelStats, sampleModelSchema } from '../introspection/models';
import { buildRouteCatalog } from '../introspection/routes';
import { buildConfigTree } from '../introspection/config';
import { buildSchedulerReport } from '../introspection/scheduler';
import { getMetricsCollector } from '../metrics/collector';
import { installMetricsInterceptors } from '../metrics/interceptors';
import { createMetricsSseResponse } from '../metrics/sse';
import {
  getDevtoolsBus,
  installRequestInstrumentation,
  installGraphqlInstrumentation,
  createOrmQueryObserver,
  createCacheObserver,
  createInstrumentationSseResponse,
  DevtoolsLoggerTransport,
} from '../instrumentation';
import { mountInstrumentationRoutes } from './api-routes';
import { renderDashboardHtml } from './dashboard-html';

let registered = false;

const logger = new Logger({ context: 'devtools:http:registrar' });

const jsonResponse = (payload: unknown): Response =>
  new Response(JSON.stringify(payload), {
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });

const errorResponse = (message: string, status: number): Response =>
  new Response(JSON.stringify({ message }), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });

/**
 * Shared guard for the opt-in per-model endpoints: verify sampling is enabled,
 * a connection resolved, and the model exists, then run `fn` and shape errors.
 */
const withModel = async (
  name: string | undefined,
  connection: MongoConnection | undefined,
  enabled: boolean,
  fn: (connection: MongoConnection, model: { target: import('@nl-framework/orm').DocumentClass; collection: string }) => Promise<unknown>,
): Promise<Response> => {
  if (!enabled) {
    return jsonResponse({ enabled: false });
  }
  if (!connection) {
    return errorResponse('No ORM connection available', 404);
  }
  if (!name) {
    return errorResponse('Missing model name', 400);
  }
  const model = findModelByName(name);
  if (!model) {
    return errorResponse(`Unknown model "${name}"`, 404);
  }
  try {
    return jsonResponse({ enabled: true, ...(await fn(connection, model) as object) });
  } catch (error) {
    logger.error('Failed to resolve model devtools request', error);
    return errorResponse('Internal server error', 500);
  }
};

interface ResolvedScheduler {
  registry?: import('@nl-framework/scheduler').SchedulerRegistry;
  service?: import('@nl-framework/scheduler').SchedulerService;
}

/**
 * Resolve the optional scheduler integration. The package is an optional peer:
 * if it isn't installed the dynamic import throws and we return an empty result,
 * so the Scheduler panel renders an empty state instead of a broken route.
 */
const resolveScheduler = async (api: HttpRouteRegistrationApi): Promise<ResolvedScheduler> => {
  try {
    const mod = await import('@nl-framework/scheduler');
    const result: ResolvedScheduler = {};
    try {
      result.registry = await api.resolve(mod.SchedulerRegistry);
    } catch {
      // Registry not provided (SchedulerModule not imported).
    }
    try {
      result.service = await api.resolve(mod.SchedulerService);
    } catch {
      // Service not provided.
    }
    return result;
  } catch {
    return {};
  }
};

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

  // ConfigService is optional — apps without ConfigModule simply get an empty
  // Config panel rather than a broken route.
  let configService: ConfigService | undefined;
  try {
    configService = await api.resolve<ConfigService>(ConfigService);
  } catch {
    configService = undefined;
  }

  // Scheduler is an optional peer — dynamically import it so devtools works in
  // apps that don't use it. When present, resolve the registry (introspection)
  // and service (manual "Run now" triggers).
  const scheduler = await resolveScheduler(api);

  // Default ORM connection, resolved only when document sampling is opted in —
  // it is the handle used to read a sample document / live stats per model.
  let ormConnection: MongoConnection | undefined;
  if (options.sampleDocuments) {
    try {
      ormConnection = await api.resolve<MongoConnection>(getConnectionToken());
    } catch {
      ormConnection = undefined;
    }
  }

  const collector = getMetricsCollector();
  collector.configure(options.maxSamples);
  installMetricsInterceptors();

  // Arm the instrumentation bus and wire the per-request debugger. Everything
  // below is inert until this point — `DevtoolsBus.emit` no-ops while disarmed.
  const bus = getDevtoolsBus();
  bus.configure(options.bufferSizes);
  bus.arm();
  installRequestInstrumentation(bus);
  installGraphqlInstrumentation(bus);
  registerQueryObserver(createOrmQueryObserver(bus));
  registerCacheObserver(createCacheObserver(bus));

  // Mirror ALL application logs into the bus for the log-tail panel by attaching
  // to the LoggerFactory (retro-applies to loggers already created at bootstrap).
  try {
    const loggerFactory = await api.resolve<LoggerFactory>(LoggerFactory);
    loggerFactory.addGlobalTransport(new DevtoolsLoggerTransport(bus));
  } catch {
    // LoggerFactory not resolvable in this context — log tail simply stays empty.
  }

  api.registerRoute('GET', basePath, () =>
    new Response(renderDashboardHtml({ basePath, title: options.title }), {
      headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' },
    }),
  );

  api.registerRoute('GET', `${basePath}/api/graph`, () => jsonResponse(buildSystemGraph(discovery)));
  api.registerRoute('GET', `${basePath}/api/routes`, () => jsonResponse(buildRouteCatalog(discovery)));
  api.registerRoute('GET', `${basePath}/api/models`, () => jsonResponse(buildModelCatalog()));
  api.registerRoute('GET', `${basePath}/api/models/:name/sample`, async (ctx) =>
    withModel(ctx.params?.name, ormConnection, options.sampleDocuments, (connection, model) =>
      sampleModelSchema(connection, model.target, model.collection),
    ),
  );
  api.registerRoute('GET', `${basePath}/api/models/:name/stats`, async (ctx) =>
    withModel(ctx.params?.name, ormConnection, options.sampleDocuments, (connection, model) =>
      readModelStats(connection, model.target, model.collection),
    ),
  );
  api.registerRoute('GET', `${basePath}/api/config`, () =>
    jsonResponse(buildConfigTree(configService?.all(), { redactKeys: options.redactKeys })),
  );
  api.registerRoute('GET', `${basePath}/api/boot`, () => jsonResponse(getBootReport()));
  api.registerRoute('GET', `${basePath}/api/scheduler`, () =>
    jsonResponse(buildSchedulerReport(scheduler.registry?.getJobSnapshots())),
  );
  api.registerRoute('POST', `${basePath}/api/scheduler/:job/run`, async (ctx) => {
    const job = ctx.params?.job;
    if (!scheduler.service) {
      return new Response(JSON.stringify({ message: 'Scheduler not available' }), {
        status: 404,
        headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
      });
    }
    if (!job) {
      return new Response(JSON.stringify({ message: 'Missing job id' }), {
        status: 400,
        headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
      });
    }
    try {
      await scheduler.service.triggerTask(decodeURIComponent(job));
      return jsonResponse({ triggered: job });
    } catch (error) {
      api.logger.warn(`[devtools] failed to trigger scheduler job "${job}"`, error);
      return new Response(
        JSON.stringify({ message: 'Failed to trigger job' }),
        { status: 400, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } },
      );
    }
  });
  api.registerRoute('GET', `${basePath}/api/metrics`, () => jsonResponse(collector.snapshot(Date.now())));
  api.registerRoute('GET', `${basePath}/api/metrics/stream`, () =>
    createMetricsSseResponse(collector, options.streamIntervalMs),
  );

  // Per-request debugger + ORM/error/log panels.
  mountInstrumentationRoutes(api, basePath, bus);
  api.registerRoute('GET', `${basePath}/api/events/stream`, () => createInstrumentationSseResponse(bus));

  api.logger.info(
    `[devtools] dashboard mounted at ${basePath} (metrics + graph + models + routes + config + cache + scheduler + boot + request inspector + ORM/errors/logs)`,
  );
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
