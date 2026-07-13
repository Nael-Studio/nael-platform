import { afterEach, describe, expect, it } from 'bun:test';
import { Module } from '@nl-framework/core';
import {
  clearHttpGuards,
  clearHttpInterceptors,
  clearHttpRouteRegistrars,
  createHttpApplication,
  type HttpApplication,
} from '@nl-framework/http';
import { HealthModule, memoryIndicator, type HealthIndicator } from '../src';

const ORIGIN = 'http://health.local';

let app: HttpApplication | undefined;

afterEach(async () => {
  await app?.close();
  app = undefined;
  clearHttpGuards();
  clearHttpInterceptors();
  clearHttpRouteRegistrars();
});

const bootstrap = async (module: ReturnType<typeof HealthModule.forRoot>): Promise<HttpApplication> => {
  @Module({ imports: [module] })
  class RootModule {}
  app = await createHttpApplication(RootModule, { port: 0 });
  return app;
};

describe('HealthModule', () => {
  it('serves liveness at /healthz (200 ok)', async () => {
    const http = await bootstrap(HealthModule.forRoot());
    const res = await http.handle(new Request(`${ORIGIN}/healthz`));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: 'ok', checks: {} });
  });

  it('serves readiness at /readyz and returns 200 when indicators are up', async () => {
    const http = await bootstrap(
      HealthModule.forRoot({
        indicators: [memoryIndicator({ maxRssBytes: Number.MAX_SAFE_INTEGER })],
      }),
    );
    const res = await http.handle(new Request(`${ORIGIN}/readyz`));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
    expect(body.checks.memory.status).toBe('up');
  });

  it('returns 503 from readiness when an indicator is down', async () => {
    const downIndicator: HealthIndicator = {
      name: 'always-down',
      check: async () => ({ status: 'down', details: { reason: 'test' } }),
    };
    const http = await bootstrap(HealthModule.forRoot({ indicators: [downIndicator] }));
    const res = await http.handle(new Request(`${ORIGIN}/readyz`));
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.status).toBe('error');
    expect(body.checks['always-down']).toEqual({ status: 'down', details: { reason: 'test' } });
  });

  it('honors custom paths and can disable readiness', async () => {
    const http = await bootstrap(
      HealthModule.forRoot({ path: '/live', readinessPath: false }),
    );
    expect((await http.handle(new Request(`${ORIGIN}/live`))).status).toBe(200);
    expect((await http.handle(new Request(`${ORIGIN}/readyz`))).status).toBe(404);
  });
});
