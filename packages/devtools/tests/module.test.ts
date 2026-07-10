import { beforeEach, describe, expect, it } from 'bun:test';
import { clearHttpRouteRegistrars, listHttpRouteRegistrars } from '@nl-framework/http';
import { NaelDevtoolsModule } from '../src/module';
import { resetDevtoolsIntegrationForTests } from '../src/http/registrar';

const withNodeEnv = (value: string, fn: () => void): void => {
  const previous = process.env.NODE_ENV;
  process.env.NODE_ENV = value;
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

describe('NaelDevtoolsModule.forRoot', () => {
  beforeEach(() => {
    clearHttpRouteRegistrars();
    resetDevtoolsIntegrationForTests();
  });

  it('registers no route registrar when disabled', () => {
    withNodeEnv('development', () => {
      NaelDevtoolsModule.forRoot({ enabled: false });
      expect(listHttpRouteRegistrars()).toHaveLength(0);
    });
  });

  it('registers exactly one registrar when enabled outside production', () => {
    withNodeEnv('development', () => {
      NaelDevtoolsModule.forRoot({ enabled: true });
      expect(listHttpRouteRegistrars()).toHaveLength(1);
    });
  });

  it('is idempotent across multiple enabled registrations', () => {
    withNodeEnv('development', () => {
      NaelDevtoolsModule.forRoot({ enabled: true });
      NaelDevtoolsModule.forRoot({ enabled: true });
      expect(listHttpRouteRegistrars()).toHaveLength(1);
    });
  });

  it('mounts nothing in production without allowInProduction', () => {
    withNodeEnv('production', () => {
      NaelDevtoolsModule.forRoot({ enabled: true });
      expect(listHttpRouteRegistrars()).toHaveLength(0);
    });
  });

  it('mounts in production only with the explicit escape hatch', () => {
    withNodeEnv('production', () => {
      NaelDevtoolsModule.forRoot({ enabled: true, allowInProduction: true });
      expect(listHttpRouteRegistrars()).toHaveLength(1);
    });
  });
});

describe('NaelDevtoolsModule.forRootAsync', () => {
  beforeEach(() => {
    clearHttpRouteRegistrars();
    resetDevtoolsIntegrationForTests();
  });

  it('always installs the registrar (guard runs at mount time)', () => {
    NaelDevtoolsModule.forRootAsync({ useFactory: () => ({ enabled: true }) });
    expect(listHttpRouteRegistrars()).toHaveLength(1);
  });

  it('throws without a provider strategy', () => {
    expect(() => NaelDevtoolsModule.forRootAsync({})).toThrow();
  });
});
