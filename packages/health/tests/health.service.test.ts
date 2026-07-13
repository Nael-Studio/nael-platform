import { describe, expect, it } from 'bun:test';
import { HealthService } from '../src/health.service';
import { mongoIndicator } from '../src';
import type { HealthIndicator, NormalizedHealthOptions } from '../src';

const fakeModuleRef = (resolve: (token: unknown) => unknown = () => undefined) =>
  ({ resolve: async (token: unknown) => resolve(token) }) as never;

const fakeDiscovery = (classes: Array<{ metatype: unknown; meta: unknown }> = []) =>
  ({ classesWithMetadata: () => classes }) as never;

const makeService = (
  indicators: HealthIndicator[],
  overrides: Partial<NormalizedHealthOptions> = {},
  moduleRef = fakeModuleRef(),
  discovery = fakeDiscovery(),
): HealthService => {
  const options: NormalizedHealthOptions = {
    path: '/healthz',
    readinessPath: '/readyz',
    indicators,
    timeoutMs: 3000,
    ...overrides,
  };
  return new HealthService(options, moduleRef, discovery);
};

const up = (name: string, details?: Record<string, unknown>): HealthIndicator => ({
  name,
  check: async () => ({ status: 'up', details }),
});

const down = (name: string, details?: Record<string, unknown>): HealthIndicator => ({
  name,
  check: async () => ({ status: 'down', details }),
});

describe('HealthService readiness', () => {
  it('returns 200 and status ok when every indicator is up', async () => {
    const service = makeService([up('mongo', { latencyMs: 2 }), up('memory')]);
    const { statusCode, report } = await service.readiness();

    expect(statusCode).toBe(200);
    expect(report.status).toBe('ok');
    expect(report.checks.mongo).toEqual({ status: 'up', details: { latencyMs: 2 } });
    expect(report.checks.memory.status).toBe('up');
  });

  it('returns 503 with per-check detail when one indicator is down', async () => {
    const service = makeService([up('memory'), down('mongo', { reason: 'refused' })]);
    const { statusCode, report } = await service.readiness();

    expect(statusCode).toBe(503);
    expect(report.status).toBe('error');
    expect(report.checks.memory.status).toBe('up');
    expect(report.checks.mongo).toEqual({ status: 'down', details: { reason: 'refused' } });
  });

  it('treats a hung indicator as down with reason "timeout"', async () => {
    const hung: HealthIndicator = { name: 'slow', check: () => new Promise(() => {}) };
    const service = makeService([hung], { timeoutMs: 20 });

    const { statusCode, report } = await service.readiness();
    expect(statusCode).toBe(503);
    expect(report.checks.slow).toEqual({ status: 'down', details: { reason: 'timeout' } });
  });

  it('reports a thrown check as down with the error reason', async () => {
    const throwing: HealthIndicator = {
      name: 'boom',
      check: async () => {
        throw new Error('kaboom');
      },
    };
    const { report } = await makeService([throwing]).readiness();
    expect(report.checks.boom).toEqual({ status: 'down', details: { reason: 'kaboom' } });
  });

  it('is 200 with empty checks when there are no indicators', async () => {
    const { statusCode, report } = await makeService([]).readiness();
    expect(statusCode).toBe(200);
    expect(report).toEqual({ status: 'ok', checks: {} });
  });
});

describe('HealthService liveness + shutdown', () => {
  it('is 200 while up and 503 once shutting down', () => {
    const service = makeService([]);
    expect(service.liveness().statusCode).toBe(200);
    expect(service.liveness().report.status).toBe('ok');

    service.onModuleDestroy();

    expect(service.isShuttingDown()).toBe(true);
    expect(service.liveness().statusCode).toBe(503);
  });
});

describe('HealthService boot binding', () => {
  it('discovers @HealthIndicator providers and runs them', async () => {
    class DiscoveredIndicator implements HealthIndicator {
      readonly name = 'discovered';
      async check() {
        return { status: 'up' as const };
      }
    }
    const instance = new DiscoveredIndicator();
    const service = makeService(
      [],
      {},
      fakeModuleRef((token) => (token === DiscoveredIndicator ? instance : undefined)),
      fakeDiscovery([{ metatype: DiscoveredIndicator, meta: true }]),
    );

    await service.onModuleInit();
    const { report } = await service.readiness();
    expect(report.checks.discovered.status).toBe('up');
  });

  it('fails fast at boot when a mongoIndicator has no registered connection', async () => {
    const service = makeService([mongoIndicator()], {}, fakeModuleRef(() => {
      throw new Error('no provider');
    }));

    await expect(service.onModuleInit()).rejects.toThrow(/no Mongo connection is registered/);
  });
});
