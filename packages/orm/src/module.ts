import { Module, type Provider, type ClassType } from '@nl-framework/core';
import { LoggerFactory } from '@nl-framework/logger';
import type { DocumentClass } from './interfaces/document';
import type {
  OrmModuleOptions,
  OrmFeatureOptions,
  OrmModuleAsyncOptions,
  OrmOptionsFactory,
} from './interfaces/module-options';
import type { OrmDriver, OrmConnection } from './interfaces/driver';
import type { SeedHistoryStore, SeedClass } from './interfaces/seeding';
import {
  getConnectionToken,
  getDatabaseToken,
  getOptionsToken,
  getRepositoryToken,
  getSeedRegistryToken,
  getSeedRunnerToken,
  getSeedHistoryToken,
  getMigrationRunnerToken,
  normalizeConnectionName,
  getDriverToken,
  getWriteNotifierToken,
} from './constants';
import { SeedRunner, type SeedRegistry } from './seeding/seed-runner';
import { MigrationRunner, type MigrationConnection } from './migrations/migration-runner';
import { registerQueryObserver } from './observability/query-observer';
import { getRegisteredSeeds } from './decorators/seed';
import { getRegisteredDocuments } from './decorators/document';

type NormalizedOrmModuleOptions = OrmModuleOptions & {
  connectionName: string;
  entities: DocumentClass[];
  seeds: SeedClass[];
  environment: string;
};

const normalizeOrmModuleOptions = (
  options: OrmModuleOptions,
  connectionName: string,
): NormalizedOrmModuleOptions => {
  if (!options.driver) {
    throw new Error('OrmModule requires a driver. Provide one via the "driver" option.');
  }

  const explicitEntities = options.entities?.length ? options.entities : undefined;
  const discoveredEntities = getRegisteredDocuments().map((metadata) => metadata.target);
  const entities = Array.from(new Set(explicitEntities ?? discoveredEntities));

  const defaultEnvironment = process.env.NODE_ENV ?? 'default';
  const environment = (options.seedEnvironment ?? defaultEnvironment).toLowerCase();

  const providedSeeds = options.seeds?.length
    ? options.seeds
    : getRegisteredSeeds().map((metadata) => metadata.target);
  const seeds = Array.from(new Set(providedSeeds));

  return {
    ...options,
    connectionName,
    entities,
    environment,
    seeds,
  } satisfies NormalizedOrmModuleOptions;
};

const createOptionsProvider = (options: OrmModuleOptions, connectionName: string): Provider => ({
  provide: getOptionsToken(connectionName),
  useFactory: () => normalizeOrmModuleOptions(options, connectionName),
});

const createAsyncOptionsProvider = (
  options: OrmModuleAsyncOptions,
  connectionName: string,
): Provider => {
  if (options.useFactory) {
    return {
      provide: getOptionsToken(connectionName),
      useFactory: async (...args: unknown[]) =>
        normalizeOrmModuleOptions(await options.useFactory!(...args), connectionName),
      inject: options.inject ?? [],
    } satisfies Provider;
  }

  const target = options.useExisting ?? options.useClass;
  if (!target) {
    throw new Error(
      'OrmModule.forRootAsync requires either useFactory, useClass, or useExisting to be configured.',
    );
  }

  return {
    provide: getOptionsToken(connectionName),
    useFactory: async (factory: OrmOptionsFactory) =>
      normalizeOrmModuleOptions(await factory.createOrmOptions(), connectionName),
    inject: [target],
  } satisfies Provider;
};

const createRootProviders = (connectionName: string, optionsProvider: Provider): Provider[] => [
  optionsProvider,
  {
    provide: getDriverToken(connectionName),
    useFactory: (options: NormalizedOrmModuleOptions) => options.driver,
    inject: [getOptionsToken(connectionName)],
  },
  {
    provide: getSeedRegistryToken(connectionName),
    useFactory: (options: NormalizedOrmModuleOptions): SeedRegistry => ({
      seeds: options.seeds,
      autoRun: options.autoRunSeeds ?? false,
      environment: options.environment,
    }),
    inject: [getOptionsToken(connectionName)],
  },
  {
    provide: getConnectionToken(connectionName),
    useFactory: (
      driver: OrmDriver,
      loggerFactory: LoggerFactory,
      options: NormalizedOrmModuleOptions,
    ) => {
      const connection = driver.createConnection(connectionName, loggerFactory);
      options.entities.forEach((entity) => connection.registerEntity(entity));
      return connection;
    },
    inject: [getDriverToken(connectionName), LoggerFactory, getOptionsToken(connectionName)],
  },
  {
    provide: getSeedHistoryToken(connectionName),
    useFactory: async (
      connection: OrmConnection,
      driver: OrmDriver,
      options: NormalizedOrmModuleOptions,
    ) => driver.createSeedHistory(connection, { connectionName, environment: options.environment }),
    inject: [getConnectionToken(connectionName), getDriverToken(connectionName), getOptionsToken(connectionName)],
  },
  {
    provide: getDatabaseToken(connectionName),
    useFactory: async (connection: OrmConnection, options: NormalizedOrmModuleOptions) => {
      // Register any configured read-query observers once, at connection init.
      for (const observer of options.observers ?? []) {
        registerQueryObserver(observer);
      }
      await connection.ensureConnection();
      return connection.getDatabase();
    },
    inject: [getConnectionToken(connectionName), getOptionsToken(connectionName)],
  },
  {
    provide: getWriteNotifierToken(connectionName),
    useFactory: (connection: OrmConnection) => connection.getWriteNotifier(),
    inject: [getConnectionToken(connectionName)],
  },
  {
    provide: getSeedRunnerToken(connectionName),
    useFactory: (
      connection: OrmConnection,
      driver: OrmDriver,
      registry: SeedRegistry,
      history: SeedHistoryStore,
      loggerFactory: LoggerFactory,
    ) => new SeedRunner(connection, driver, registry, history, loggerFactory, connectionName),
    inject: [
      getConnectionToken(connectionName),
      getDriverToken(connectionName),
      getSeedRegistryToken(connectionName),
      getSeedHistoryToken(connectionName),
      LoggerFactory,
    ],
  },
  {
    provide: getMigrationRunnerToken(connectionName),
    useFactory: (
      connection: OrmConnection,
      options: NormalizedOrmModuleOptions,
      loggerFactory: LoggerFactory,
    ) =>
      new MigrationRunner(
        connection as unknown as MigrationConnection,
        options.migrations ?? [],
        loggerFactory,
        connectionName,
      ),
    inject: [getConnectionToken(connectionName), getOptionsToken(connectionName), LoggerFactory],
  },
];

const createAsyncProviders = (options: OrmModuleAsyncOptions): Provider[] => {
  if (options.useFactory || options.useExisting) {
    return [];
  }

  if (!options.useClass) {
    throw new Error('OrmModule.forRootAsync requires useClass when neither useFactory nor useExisting are provided.');
  }

  return [
    {
      provide: options.useClass,
      useClass: options.useClass,
    },
  ];
};

const createFeatureProviders = (
  entities: DocumentClass[],
  connectionName: string,
): Provider[] =>
  entities.map((entity) => ({
    provide: getRepositoryToken(entity, connectionName),
    useFactory: async (connection: OrmConnection, driver: OrmDriver) => {
      connection.registerEntity(entity);
      return driver.createRepository(connection, entity);
    },
    inject: [getConnectionToken(connectionName), getDriverToken(connectionName)],
  }));

export class OrmModule {
  static forRoot(options: OrmModuleOptions): ClassType {
    if (!options.driver) {
      throw new Error('OrmModule.forRoot requires a driver. Provide one via the "driver" option.');
    }

    const connectionName = normalizeConnectionName(options.connectionName ?? options.name);
    const optionsProvider = createOptionsProvider(options, connectionName);
    const providers = createRootProviders(connectionName, optionsProvider);

    const exports = providers.map((provider) =>
      typeof provider === 'function' ? provider : provider.provide,
    );

    @Module({
      providers,
      exports,
    })
  class OrmRootModule {}

  return OrmRootModule;
  }

  static forRootAsync(options: OrmModuleAsyncOptions): ClassType {
    const connectionName = normalizeConnectionName(options.connectionName ?? options.name);
    const optionsProvider = createAsyncOptionsProvider(options, connectionName);
    const providers = [
      ...createRootProviders(connectionName, optionsProvider),
      ...createAsyncProviders(options),
    ];

    const exports = providers.map((provider) =>
      typeof provider === 'function' ? provider : provider.provide,
    );

    @Module({
      imports: options.imports ?? [],
      providers,
      exports,
    })
    class OrmRootAsyncModule {}

    return OrmRootAsyncModule;
  }

  static forFeature(
    entitiesOrOptions: OrmFeatureOptions | DocumentClass[],
    connectionName?: string,
  ): ClassType {
    const { entities, connectionName: resolvedConnection } = Array.isArray(entitiesOrOptions)
      ? { entities: entitiesOrOptions, connectionName }
      : { entities: entitiesOrOptions.entities, connectionName: entitiesOrOptions.connectionName ?? connectionName };

    const normalizedConnection = normalizeConnectionName(resolvedConnection);
    const providers = createFeatureProviders(entities, normalizedConnection);

    const exports = providers.map((provider) =>
      typeof provider === 'function' ? provider : provider.provide,
    );

    @Module({
      providers,
      exports,
    })
    class OrmFeatureModule {}

    return OrmFeatureModule;
  }
}
