import { Module, type Provider, type ClassType } from '@nl-framework/core';
import { LoggerFactory } from '@nl-framework/logger';
import type { DocumentClass } from './interfaces/document';
import type { OrmModuleOptions, OrmFeatureOptions } from './interfaces/module-options';
import type { OrmDriver, OrmConnection } from './interfaces/driver';
import type { SeedHistoryStore } from './interfaces/seeding';
import {
  getConnectionToken,
  getDatabaseToken,
  getOptionsToken,
  getRepositoryToken,
  getSeedRegistryToken,
  getSeedRunnerToken,
  getSeedHistoryToken,
  normalizeConnectionName,
  getDriverToken,
} from './constants';
import { SeedRunner, type SeedRegistry } from './seeding/seed-runner';
import { getRegisteredSeeds } from './decorators/seed';
import { getRegisteredDocuments } from './decorators/document';

const createRootProviders = (options: OrmModuleOptions, connectionName: string): Provider[] => {
  const explicitEntities = options.entities?.length ? options.entities : undefined;
  const discoveredEntities = getRegisteredDocuments().map((metadata) => metadata.target);
  const uniqueEntities = Array.from(new Set(explicitEntities ?? discoveredEntities));

  const normalizedOptions = {
    ...options,
    connectionName,
    entities: uniqueEntities,
  } satisfies OrmModuleOptions & { connectionName: string; entities: DocumentClass[] };

  const defaultEnvironment = process.env.NODE_ENV ?? 'default';
  const environment = (normalizedOptions.seedEnvironment ?? defaultEnvironment).toLowerCase();

  const discoveredSeeds = normalizedOptions.seeds?.length
    ? normalizedOptions.seeds
    : getRegisteredSeeds().map((metadata) => metadata.target);
  const uniqueSeeds = Array.from(new Set(discoveredSeeds));

  const seedRegistry: SeedRegistry = {
    seeds: uniqueSeeds,
    autoRun: normalizedOptions.autoRunSeeds ?? false,
    environment,
  };

  return [
    {
      provide: getOptionsToken(connectionName),
      useValue: normalizedOptions,
    },
    {
      provide: getDriverToken(connectionName),
      useValue: normalizedOptions.driver,
    },
    {
      provide: getSeedHistoryToken(connectionName),
      useFactory: async (connection: OrmConnection, driver: OrmDriver) =>
        driver.createSeedHistory(connection, { connectionName, environment }),
      inject: [getConnectionToken(connectionName), getDriverToken(connectionName)],
    },
    {
      provide: getSeedRegistryToken(connectionName),
      useValue: seedRegistry,
    },
    {
      provide: getConnectionToken(connectionName),
      useFactory: (driver: OrmDriver, loggerFactory: LoggerFactory) => {
        const connection = driver.createConnection(connectionName, loggerFactory);
        normalizedOptions.entities.forEach((entity) => connection.registerEntity(entity));
        return connection;
      },
      inject: [getDriverToken(connectionName), LoggerFactory],
    },
    {
      provide: getDatabaseToken(connectionName),
      useFactory: async (connection: OrmConnection) => {
        await connection.ensureConnection();
        return connection.getDatabase();
      },
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

    const connectionName = normalizeConnectionName(options.connectionName);
    const providers = createRootProviders(options, connectionName);

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

  static forFeature(entitiesOrOptions: OrmFeatureOptions | DocumentClass[]): ClassType {
    const { entities, connectionName } = Array.isArray(entitiesOrOptions)
      ? { entities: entitiesOrOptions, connectionName: undefined }
      : entitiesOrOptions;

    const normalizedConnection = normalizeConnectionName(connectionName);
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
