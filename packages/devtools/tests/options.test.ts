import { afterEach, describe, expect, it } from 'bun:test';
import { evaluateGuard, normalizeDevtoolsOptions } from '../src/options';
import { DEFAULT_BASE_PATH, DEFAULT_DASHBOARD_TITLE } from '../src/constants';

const withNodeEnv = (value: string | undefined, fn: () => void): void => {
  const previous = process.env.NODE_ENV;
  if (value === undefined) {
    delete process.env.NODE_ENV;
  } else {
    process.env.NODE_ENV = value;
  }
  try {
    fn();
  } finally {
    if (previous === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = previous;
    }
  }
};

describe('normalizeDevtoolsOptions', () => {
  it('applies fail-safe defaults', () => {
    const normalized = normalizeDevtoolsOptions();
    expect(normalized).toEqual({
      enabled: false,
      allowInProduction: false,
      basePath: DEFAULT_BASE_PATH,
      title: DEFAULT_DASHBOARD_TITLE,
      maxSamples: 2000,
      streamIntervalMs: 2000,
    });
  });

  it('normalizes base path: adds leading slash, strips trailing slash, guards root', () => {
    expect(normalizeDevtoolsOptions({ basePath: 'devtools' }).basePath).toBe('/devtools');
    expect(normalizeDevtoolsOptions({ basePath: '/devtools/' }).basePath).toBe('/devtools');
    expect(normalizeDevtoolsOptions({ basePath: '/' }).basePath).toBe(DEFAULT_BASE_PATH);
    expect(normalizeDevtoolsOptions({ basePath: '   ' }).basePath).toBe(DEFAULT_BASE_PATH);
  });
});

describe('evaluateGuard', () => {
  afterEach(() => {
    // ensure no leaked NODE_ENV between assertions
  });

  it('refuses when disabled', () => {
    withNodeEnv('development', () => {
      const decision = evaluateGuard(normalizeDevtoolsOptions({ enabled: false }));
      expect(decision.armed).toBe(false);
      expect(decision.reason).toContain('disabled');
    });
  });

  it('arms when enabled outside production', () => {
    withNodeEnv('development', () => {
      expect(evaluateGuard(normalizeDevtoolsOptions({ enabled: true })).armed).toBe(true);
    });
  });

  it('blocks in production even when enabled', () => {
    withNodeEnv('production', () => {
      const decision = evaluateGuard(normalizeDevtoolsOptions({ enabled: true }));
      expect(decision.armed).toBe(false);
      expect(decision.reason).toContain('production');
    });
  });

  it('allows production only with the explicit allowInProduction escape hatch', () => {
    withNodeEnv('production', () => {
      expect(
        evaluateGuard(normalizeDevtoolsOptions({ enabled: true, allowInProduction: true })).armed,
      ).toBe(true);
    });
  });
});
