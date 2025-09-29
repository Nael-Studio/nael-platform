import type { Adapter, BetterAuthOptions, BetterAuthPlugin } from 'better-auth';
import type { AdapterFactory } from 'better-auth/adapters';
import { normalizeConnectionName } from '@nl-framework/orm';
import { mergePluginCollections } from './plugins';
import type { BetterAuthModuleOptions } from '../interfaces/module-options';

export interface NormalizedBetterAuthModuleOptions {
  betterAuth: BetterAuthOptions;
  basePlugins: BetterAuthPlugin[];
  extendPlugins: BetterAuthPlugin[];
  connectionName: string;
  adapter?: Adapter | AdapterFactory;
  database?: BetterAuthOptions['database'];
  autoRunMigrations: boolean;
}

const ensureSecret = (options: BetterAuthOptions): BetterAuthOptions => {
  if (options.secret) {
    return options;
  }

  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) {
    throw new Error(
      'BetterAuthModule requires a secret. Provide one via BetterAuthModuleOptions or set the BETTER_AUTH_SECRET environment variable.',
    );
  }

  return {
    ...options,
    secret,
  } satisfies BetterAuthOptions;
};

export const normalizeModuleOptions = (
  options: BetterAuthModuleOptions,
): NormalizedBetterAuthModuleOptions => {
  if (!options?.betterAuth) {
    throw new Error('BetterAuthModuleOptions must include the "betterAuth" configuration object.');
  }

  const copied = { ...options.betterAuth } as BetterAuthOptions & { plugins?: BetterAuthPlugin[] };
  const basePlugins = Array.isArray(copied.plugins) ? [...copied.plugins] : [];
  delete copied.plugins;

  const betterAuth = ensureSecret(copied);

  const legacyAdapter = options.adapter;
  const providedDatabase = options.database ??
    (legacyAdapter
      ? (typeof legacyAdapter === 'function'
          ? (legacyAdapter as AdapterFactory)
          : ((() => legacyAdapter) as AdapterFactory))
      : undefined);

  if (!providedDatabase) {
    throw new Error(
      'BetterAuthModuleOptions requires a database adapter. Provide one via the "database" option (preferred) or the legacy "adapter" option.',
    );
  }

  return {
    betterAuth,
    basePlugins,
    extendPlugins: options.extendPlugins ? mergePluginCollections(options.extendPlugins) : [],
    connectionName: normalizeConnectionName(options.connectionName),
    adapter: options.adapter,
    database: providedDatabase,
    autoRunMigrations: options.autoRunMigrations ?? true,
  } satisfies NormalizedBetterAuthModuleOptions;
};

export const buildPluginList = (
  normalized: NormalizedBetterAuthModuleOptions,
  globals: BetterAuthPlugin[],
  additional: BetterAuthPlugin[] = [],
): BetterAuthPlugin[] =>
  mergePluginCollections(normalized.basePlugins, normalized.extendPlugins, globals, additional);
