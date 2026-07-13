import {
  Injectable,
  Inject,
  ModuleRef,
  DiscoveryService,
  type OnModuleInit,
  type OnModuleDestroy,
  type Token,
} from '@nl-framework/core';
import { HEALTH_OPTIONS, HEALTH_INDICATOR_METADATA_KEY } from './constants';
import {
  isBindableIndicator,
  type HealthCheckContext,
  type HealthIndicator,
  type HealthReport,
  type HealthResult,
  type NormalizedHealthOptions,
} from './interfaces';

export interface HealthResponse {
  statusCode: number;
  report: HealthReport;
}

const isIndicator = (value: unknown): value is HealthIndicator =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as HealthIndicator).name === 'string' &&
  typeof (value as HealthIndicator).check === 'function';

@Injectable()
export class HealthService implements OnModuleInit, OnModuleDestroy {
  private indicators: HealthIndicator[] = [];
  private initialized?: Promise<void>;
  private shuttingDown = false;

  private readonly context: HealthCheckContext = {
    resolve: async <T>(token: Token<T>): Promise<T | undefined> => {
      try {
        return await this.moduleRef.resolve<T>(token);
      } catch {
        return undefined;
      }
    },
  };

  constructor(
    @Inject(HEALTH_OPTIONS) private readonly options: NormalizedHealthOptions,
    private readonly moduleRef: ModuleRef,
    private readonly discovery: DiscoveryService,
  ) {}

  /** Bind indicators at boot so misconfiguration (e.g. missing ORM) fails fast. */
  async onModuleInit(): Promise<void> {
    await this.ensureInitialized();
  }

  /** Flip liveness to 503 once shutdown begins so rolling deploys drain. */
  onModuleDestroy(): void {
    this.shuttingDown = true;
  }

  isShuttingDown(): boolean {
    return this.shuttingDown;
  }

  private ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      this.initialized = this.initialize();
    }
    return this.initialized;
  }

  private async initialize(): Promise<void> {
    const discovered = await this.discoverIndicators();
    this.indicators = [...this.options.indicators, ...discovered];

    for (const indicator of this.indicators) {
      if (isBindableIndicator(indicator)) {
        await indicator.bind(this.context);
      }
    }
  }

  private async discoverIndicators(): Promise<HealthIndicator[]> {
    const classes = this.discovery.classesWithMetadata<boolean>(HEALTH_INDICATOR_METADATA_KEY);
    const resolved: HealthIndicator[] = [];
    for (const { metatype } of classes) {
      const instance = await this.context.resolve(metatype);
      if (isIndicator(instance)) {
        resolved.push(instance);
      }
    }
    return resolved;
  }

  /** Liveness: 200 while up, 503 once shutting down. */
  liveness(): HealthResponse {
    if (this.shuttingDown) {
      return { statusCode: 503, report: { status: 'error', checks: {} } };
    }
    return { statusCode: 200, report: { status: 'ok', checks: {} } };
  }

  /** Readiness: run every indicator in parallel with a per-indicator timeout. */
  async readiness(): Promise<HealthResponse> {
    await this.ensureInitialized();

    const results = await Promise.all(
      this.indicators.map(async (indicator) => ({
        name: indicator.name,
        result: await this.runWithTimeout(indicator),
      })),
    );

    const checks: Record<string, HealthResult> = {};
    let allUp = true;
    for (const { name, result } of results) {
      checks[name] = result;
      if (result.status !== 'up') {
        allUp = false;
      }
    }

    return {
      statusCode: allUp ? 200 : 503,
      report: { status: allUp ? 'ok' : 'error', checks },
    };
  }

  private async runWithTimeout(indicator: HealthIndicator): Promise<HealthResult> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<HealthResult>((resolve) => {
      timer = setTimeout(
        () => resolve({ status: 'down', details: { reason: 'timeout' } }),
        this.options.timeoutMs,
      );
    });

    try {
      return await Promise.race([indicator.check(), timeout]);
    } catch (error) {
      return {
        status: 'down',
        details: { reason: error instanceof Error ? error.message : String(error) },
      };
    } finally {
      if (timer) {
        clearTimeout(timer);
      }
    }
  }
}
