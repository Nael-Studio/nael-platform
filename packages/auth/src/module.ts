import { Module, type ClassType, type Provider } from '@nl-framework/core';
import { LoggerFactory } from '@nl-framework/logger';
import { betterAuth, type Adapter, type BetterAuthOptions, type BetterAuthPlugin } from 'better-auth';
import type { AdapterFactory } from 'better-auth/adapters';
import {
  BETTER_AUTH_ADAPTER,
  BETTER_AUTH_INSTANCE,
  BETTER_AUTH_OPTIONS,
  getGlobalPlugins,
  registerGlobalPlugins,
} from './constants';
import {
  normalizeModuleOptions,
  buildPluginList,
  type NormalizedBetterAuthModuleOptions,
} from './utils/options';
import type {
  BetterAuthModuleOptions,
  BetterAuthModuleAsyncOptions,
  BetterAuthOptionsFactory,
} from './interfaces/module-options';
import { BetterAuthService } from './service';

const createAdapterProvider = (): Provider => ({
  provide: BETTER_AUTH_ADAPTER,
  useFactory: (options: NormalizedBetterAuthModuleOptions) => {
    if (!options.database) {
      throw new Error(
        'BetterAuthModule requires a database adapter. Configure BetterAuthModuleOptions.database (or legacy adapter) before initializing.',
      );
    }
    return options.database;
  },
  inject: [BETTER_AUTH_OPTIONS],
});

const createAuthInstanceProvider = (): Provider => ({
  provide: BETTER_AUTH_INSTANCE,
  useFactory: async (
    options: NormalizedBetterAuthModuleOptions,
    databaseAdapter: BetterAuthOptions['database'],
    loggerFactory: LoggerFactory,
  ) => {
    const logger = loggerFactory.create({ context: 'BetterAuthModule' });
    const plugins = buildPluginList(options, getGlobalPlugins());

    const config = {
      ...options.betterAuth,
    } as BetterAuthOptions & {
      adapter?: Adapter | AdapterFactory;
      database?: BetterAuthOptions['database'];
      plugins?: BetterAuthPlugin[];
    };

    if (config.database === undefined) {
      config.database = databaseAdapter;
    }

    if (config.adapter === undefined && options.adapter) {
      config.adapter = options.adapter;
    }

    config.plugins = plugins;

    const auth = betterAuth(config);

    if (options.autoRunMigrations) {
      const context = (auth as { context?: { runMigrations?: () => Promise<void> } }).context;
      if (context?.runMigrations) {
        try {
          await context.runMigrations();
        } catch (error) {
          const message =
            error instanceof Error ? `${error.name}: ${error.message}` : 'Unknown migration failure';
          logger.warn('Failed to run Better Auth migrations', { error: message });
        }
      }
    }

    logger.info('Better Auth instance initialized', {
      plugins: plugins.length,
      autoRunMigrations: options.autoRunMigrations,
    });

    return auth;
  },
  inject: [BETTER_AUTH_OPTIONS, BETTER_AUTH_ADAPTER, LoggerFactory],
});

const COMMON_PROVIDERS: Provider[] = [createAdapterProvider(), createAuthInstanceProvider()];

const createSynchronousProviders = (
  normalized: NormalizedBetterAuthModuleOptions,
): Provider[] => [
  {
    provide: BETTER_AUTH_OPTIONS,
    useValue: normalized,
  },
  ...COMMON_PROVIDERS,
];

const createAsyncOptionsProvider = (options: BetterAuthModuleAsyncOptions): Provider => {
  if (options.useFactory) {
    return {
      provide: BETTER_AUTH_OPTIONS,
      useFactory: async (...args: unknown[]) =>
        normalizeModuleOptions(await options.useFactory!(...args)),
      inject: options.inject ?? [],
    } satisfies Provider;
  }

  const target = options.useExisting ?? options.useClass;
  if (!target) {
    throw new Error(
      'BetterAuthModule.forRootAsync requires useFactory, useClass, or useExisting to resolve module options.',
    );
  }

  return {
    provide: BETTER_AUTH_OPTIONS,
    useFactory: async (factory: BetterAuthOptionsFactory) =>
      normalizeModuleOptions(await factory.createBetterAuthOptions()),
    inject: [target],
  } satisfies Provider;
};

const createAsyncProviders = (options: BetterAuthModuleAsyncOptions): Provider[] => {
  if (options.useFactory || options.useExisting) {
    return [];
  }

  if (!options.useClass) {
    throw new Error(
      'BetterAuthModule.forRootAsync requires useClass when neither useFactory nor useExisting are provided.',
    );
  }

  return [
    {
      provide: options.useClass,
      useClass: options.useClass,
    },
  ];
};

export class BetterAuthModule {
  static forRoot(options: BetterAuthModuleOptions): ClassType {
    const normalized = normalizeModuleOptions(options);

    @Module({
      providers: [...createSynchronousProviders(normalized), BetterAuthService],
      exports: [BetterAuthService, BETTER_AUTH_INSTANCE, BETTER_AUTH_OPTIONS, BETTER_AUTH_ADAPTER],
    })
    class BetterAuthRootModule {}

    return BetterAuthRootModule;
  }

  static forRootAsync(options: BetterAuthModuleAsyncOptions): ClassType {
    const providers: Provider[] = [
      createAsyncOptionsProvider(options),
      ...COMMON_PROVIDERS,
      ...createAsyncProviders(options),
    ];

    @Module({
      imports: options.imports ?? [],
      providers: [...providers, BetterAuthService],
      exports: [BetterAuthService, BETTER_AUTH_INSTANCE, BETTER_AUTH_OPTIONS, BETTER_AUTH_ADAPTER],
    })
    class BetterAuthRootAsyncModule {}

    return BetterAuthRootAsyncModule;
  }

  static registerPlugins(plugins: BetterAuthPlugin[]): ClassType {
    registerGlobalPlugins(plugins);

    @Module({})
    class BetterAuthPluginModule {}

    return BetterAuthPluginModule;
  }
}
