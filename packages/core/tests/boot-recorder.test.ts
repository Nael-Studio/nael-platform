import { afterEach, describe, expect, it } from 'bun:test';
import {
  Application,
  Controller,
  Injectable,
  Module,
  enableBootRecording,
  getBootReport,
  isBootRecording,
  resetBootRecorderForTests,
} from '../src';

afterEach(() => {
  resetBootRecorderForTests();
});

@Injectable()
class Repo {}

@Injectable()
class Service {
  constructor(private readonly repo: Repo) {}
}

@Controller('/things')
class ThingsController {
  constructor(private readonly service: Service) {}
}

@Module({ providers: [Repo, Service], controllers: [ThingsController] })
class BootModule {}

describe('boot recorder', () => {
  it('is off by default and adds nothing', async () => {
    expect(isBootRecording()).toBe(false);

    const app = new Application();
    await app.bootstrap(BootModule);
    const report = getBootReport();
    expect(report.enabled).toBe(false);
    expect(report.providers).toEqual([]);
    expect(report.modules).toEqual([]);
    await app.close();
  });

  it('records module order and provider construction when enabled before bootstrap', async () => {
    enableBootRecording();
    expect(isBootRecording()).toBe(true);

    const app = new Application();
    await app.bootstrap(BootModule);

    const report = getBootReport();
    expect(report.enabled).toBe(true);
    expect(report.modules.some((m) => m.module === 'BootModule')).toBe(true);

    const tokens = report.providers.map((p) => p.token);
    expect(tokens).toContain('Service');
    expect(tokens).toContain('Repo');
    expect(tokens).toContain('ThingsController');

    // Providers are sorted slowest-first and carry a non-negative duration.
    expect(report.providers.every((p) => p.durationMs >= 0)).toBe(true);
    for (let i = 1; i < report.providers.length; i += 1) {
      expect(report.providers[i - 1]!.durationMs).toBeGreaterThanOrEqual(report.providers[i]!.durationMs);
    }
    expect(report.stats.providers).toBeGreaterThanOrEqual(3);

    await app.close();
  });
});
