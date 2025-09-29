import { beforeEach, describe, expect, it } from 'bun:test';
import { memoryAdapter } from 'better-auth/adapters/memory';
import { username } from 'better-auth/plugins/username';
import { normalizeModuleOptions, buildPluginList } from '../src/utils/options';
import { resetGlobalPlugins, registerGlobalPlugins, getGlobalPlugins } from '../src/constants';
import type { BetterAuthModuleOptions } from '../src/interfaces/module-options';

const createBaseOptions = (overrides: Partial<BetterAuthModuleOptions> = {}): BetterAuthModuleOptions => {
  const adapter = overrides.adapter ?? memoryAdapter({});
  return {
    betterAuth: {
      secret: 'test-secret',
      ...(overrides.betterAuth ?? {}),
    },
    adapter,
    database: overrides.database,
    extendPlugins: overrides.extendPlugins,
    autoRunMigrations: overrides.autoRunMigrations,
    connectionName: overrides.connectionName,
  } satisfies BetterAuthModuleOptions;
};

describe('normalizeModuleOptions', () => {
  beforeEach(() => {
    resetGlobalPlugins();
    delete process.env.BETTER_AUTH_SECRET;
  });

  it('throws when neither database nor adapter is provided', () => {
    const options = {
      betterAuth: {
        secret: 'value',
      },
    } as BetterAuthModuleOptions;

    expect(() => normalizeModuleOptions(options)).toThrow('BetterAuthModuleOptions requires a database adapter');
  });

  it('uses the provided secret', () => {
    const normalized = normalizeModuleOptions(createBaseOptions());
    expect(normalized.betterAuth.secret).toBe('test-secret');
  });

  it('falls back to the BETTER_AUTH_SECRET environment variable', () => {
    process.env.BETTER_AUTH_SECRET = 'env-secret';
    const normalized = normalizeModuleOptions({
      betterAuth: {},
      adapter: memoryAdapter({}),
    });
    expect(normalized.betterAuth.secret).toBe('env-secret');
  });

  it('maps legacy adapter into the database option', () => {
    const adapter = memoryAdapter({});
    const normalized = normalizeModuleOptions(
      createBaseOptions({
        adapter,
      }),
    );

    expect(normalized.database).toBe(adapter);
  });

  it('prefers explicit database configuration when provided', () => {
    const legacyAdapter = memoryAdapter({});
    const explicitDatabase = memoryAdapter({});

    const normalized = normalizeModuleOptions({
      betterAuth: {
        secret: 'value',
      },
      adapter: legacyAdapter,
      database: explicitDatabase,
    });

    expect(normalized.database).toBe(explicitDatabase);
    expect(normalized.adapter).toBe(legacyAdapter);
  });

  it('merges built-in and extended plugins without duplicates', () => {
    const plugin = username();

    const normalized = normalizeModuleOptions(
      createBaseOptions({
        betterAuth: {
          secret: 'value',
          plugins: [plugin],
        },
        extendPlugins: [plugin],
      }),
    );

    registerGlobalPlugins([plugin, plugin]);

    const merged = buildPluginList(normalized, getGlobalPlugins());
    expect(merged).toHaveLength(1);
  });

  it('sets auto run migrations to true by default', () => {
    const normalized = normalizeModuleOptions(createBaseOptions());
    expect(normalized.autoRunMigrations).toBe(true);
  });
});
