import { Module, type Provider, type ClassType } from '@nl-framework/core';
import { LoggerFactory } from '@nl-framework/logger';
import type { DocumentClass } from './interfaces/document';
import type { OrmModuleOptions, OrmFeatureOptions } from './interfaces/module-options';
import type { OrmDriver, OrmConnection } from './interfaces/driver';
import {
  getConnectionToken,
  getDatabaseToken,
  getOptionsToken,
  getRepositoryToken,
  getSeedRegistryToken,
  getSeedRunnerToken,
  normalizeConnectionName,
  getDriverToken,
} from './constants';
import { SeedRunner, type SeedRegistry } from './seeding/seed-runner';

const createRootProviders = (options: OrmModuleOptions, connectionName: string): Provider[] => {
  const normalizedOptions = {
    ...options,
    connectionName,
  } satisfies OrmModuleOptions & { connectionName: string };

  const seedRegistry: SeedRegistry = {
    seeds: normalizedOptions.seeds ?? [],
    autoRun: normalizedOptions.autoRunSeeds ?? false,
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
      provide: getSeedRegistryToken(connectionName),
      useValue: seedRegistry,
    },
    {
      provide: getConnectionToken(connectionName),
      useFactory: (driver: OrmDriver, loggerFactory: LoggerFactory) => {
        const connection = driver.createConnection(connectionName, loggerFactory);
        normalizedOptions.entities?.forEach((entity) => connection.registerEntity(entity));
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
        loggerFactory: LoggerFactory,
      ) => new SeedRunner(connection, driver, registry, loggerFactory, connectionName),
      inject: [
        getConnectionToken(connectionName),
        getDriverToken(connectionName),
        getSeedRegistryToken(connectionName),
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
