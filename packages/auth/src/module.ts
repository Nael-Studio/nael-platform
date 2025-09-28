import {
  Module,
  type Provider,
  type ClassType,
  type Token,
} from '@nl-framework/core';
import { LoggerFactory } from '@nl-framework/logger';
import { BetterAuthService } from './better-auth.service';
import {
  BetterAuthModuleAsyncOptions,
  BetterAuthModuleOptions,
  BetterAuthModuleOptionsFactory,
  BetterAuthAdapter,
  BetterAuthUserInput,
  BetterAuthPlugin,
} from './interfaces';
import { BETTER_AUTH_INSTANCE, BETTER_AUTH_OPTIONS } from './tokens';
import { InMemoryBetterAuth } from './fallback-adapter';
import { tryCreateBetterAuthInstance } from './dynamic-loader';

interface NormalizedBetterAuthModuleOptions extends BetterAuthModuleOptions {
  defaultUsers: BetterAuthUserInput[];
  autoSeed: boolean;
  plugins: BetterAuthPlugin[];
}

const normalizeOptions = (options: BetterAuthModuleOptions = {}): NormalizedBetterAuthModuleOptions => ({
  instance: options.instance,
  config: options.config ?? {},
  plugins: options.plugins ?? [],
  defaultUsers: options.defaultUsers ?? [],
  autoSeed: options.autoSeed ?? true,
});

const createOptionsProvider = (options: BetterAuthModuleOptions): Provider => ({
  provide: BETTER_AUTH_OPTIONS,
  useValue: normalizeOptions(options),
});

const createAsyncOptionsProvider = (
  options: BetterAuthModuleAsyncOptions,
): Provider => {
  if (options.useFactory) {
    return {
      provide: BETTER_AUTH_OPTIONS,
      useFactory: async (...args: unknown[]) => normalizeOptions(await options.useFactory!(...args)),
      inject: options.inject ?? [],
    } satisfies Provider;
  }

  const target = options.useExisting ?? options.useClass;
  if (!target) {
    throw new Error(
      'AuthModule.forRootAsync requires either useFactory, useClass, or useExisting to be configured.',
    );
  }

  return {
    provide: BETTER_AUTH_OPTIONS,
    useFactory: async (factory: BetterAuthModuleOptionsFactory) =>
      normalizeOptions(await factory.createBetterAuthOptions()),
    inject: [target],
  } satisfies Provider;
};

const createAsyncProviders = (options: BetterAuthModuleAsyncOptions): Provider[] => {
  if (options.useFactory || options.useExisting) {
    return [];
  }

  if (!options.useClass) {
    throw new Error('AuthModule.forRootAsync requires useClass when neither useFactory nor useExisting are provided.');
  }

  return [
    {
      provide: options.useClass,
      useClass: options.useClass,
    },
  ];
};

const applyPlugins = async (
  instance: BetterAuthAdapter,
  plugins: BetterAuthPlugin[],
  logger: LoggerFactory,
): Promise<void> => {
  if (!plugins.length) {
    return;
  }

  const pluginLogger = logger.create({ context: 'BetterAuthPlugin' });
  for (const plugin of plugins) {
    try {
      if (typeof instance.use === 'function') {
        await instance.use(plugin);
      } else if (typeof plugin === 'function') {
        await plugin(instance as never);
      } else {
        pluginLogger.warn('Skipped plugin because adapter lacks "use" method and plugin is not callable.');
      }
    } catch (error) {
      pluginLogger.error('Failed to apply BetterAuth plugin', error instanceof Error ? error : undefined);
    }
  }
};

const seedUsers = async (
  instance: BetterAuthAdapter,
  users: BetterAuthUserInput[],
  loggerFactory: LoggerFactory,
): Promise<void> => {
  if (!users.length) {
    return;
  }

  const logger = loggerFactory.create({ context: 'BetterAuthSeeder' });
  if (typeof (instance as InMemoryBetterAuth).seed === 'function') {
    (instance as InMemoryBetterAuth).seed(users);
    logger.info('Seeded default users using in-memory BetterAuth adapter', { count: users.length });
    return;
  }

  if (typeof instance.register !== 'function') {
    logger.warn('Cannot seed default users because adapter does not expose register().');
    return;
  }

  for (const user of users) {
    try {
      await instance.register(user);
    } catch (error) {
      logger.warn('Failed to register default user', {
        email: user.email,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  logger.info('Seeded default users via custom BetterAuth adapter', { count: users.length });
};

const createInstanceProvider = (): Provider => ({
  provide: BETTER_AUTH_INSTANCE,
  useFactory: async (
    options: NormalizedBetterAuthModuleOptions,
    loggerFactory: LoggerFactory,
  ): Promise<BetterAuthAdapter> => {
    const logger = loggerFactory.create({ context: 'BetterAuthModule' });

    if (options.instance) {
      await applyPlugins(options.instance, options.plugins, loggerFactory);
      if (options.autoSeed) {
        await seedUsers(options.instance, options.defaultUsers, loggerFactory);
      }
      return options.instance;
    }

    const created = await tryCreateBetterAuthInstance(options.config ?? {}, logger);
    const adapter = (created as BetterAuthAdapter) ?? new InMemoryBetterAuth(options.config ?? {});

    await applyPlugins(adapter, options.plugins, loggerFactory);

    if (options.autoSeed && options.defaultUsers.length) {
      await seedUsers(adapter, options.defaultUsers, loggerFactory);
    }

    return adapter;
  },
  inject: [BETTER_AUTH_OPTIONS, LoggerFactory],
});

const createServiceProvider = (): Provider => ({
  provide: BetterAuthService,
  useFactory: (adapter: BetterAuthAdapter, loggerFactory: LoggerFactory) => {
    const logger = loggerFactory.create({ context: 'BetterAuthService' });
    return new BetterAuthService(adapter, logger);
  },
  inject: [BETTER_AUTH_INSTANCE, LoggerFactory],
});

const collectExports = (providers: Provider[]): Token[] =>
  providers.map((provider) => (typeof provider === 'function' ? provider : provider.provide));

export class AuthModule {
  static forRoot(options: BetterAuthModuleOptions = {}): ClassType {
    const providers: Provider[] = [
      createOptionsProvider(options),
      createInstanceProvider(),
      createServiceProvider(),
    ];

    const exports = collectExports(providers);

    @Module({
      providers,
      exports,
    })
    class BetterAuthRootModule {}

    return BetterAuthRootModule;
  }

  static forRootAsync(options: BetterAuthModuleAsyncOptions): ClassType {
    const providers: Provider[] = [
      createAsyncOptionsProvider(options),
      createInstanceProvider(),
      createServiceProvider(),
      ...createAsyncProviders(options),
    ];

    const exports = collectExports(providers);

    @Module({
      imports: options.imports ?? [],
      providers,
      exports,
    })
    class BetterAuthRootAsyncModule {}

    return BetterAuthRootAsyncModule;
  }
}
