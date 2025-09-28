import { Module, type Provider, type ClassType } from '@nl-framework/core';
import { LoggerFactory } from '@nl-framework/logger';
import type { DocumentClass } from './interfaces/document';
import type { MongoOrmModuleOptions, MongoOrmFeatureOptions } from './interfaces/module-options';
import { MongoConnection } from './connection/mongo-connection';
import {
  getConnectionToken,
  getDatabaseToken,
  getOptionsToken,
  getRepositoryToken,
  getSeedRegistryToken,
  getSeedRunnerToken,
  normalizeConnectionName,
} from './constants';
import { getDocumentMetadata } from './decorators/document';
import { MongoRepository } from './repository/mongo-repository';
import { SeedRunner, type SeedRegistry } from './seeding/seed-runner';

const createRootProviders = (options: MongoOrmModuleOptions, connectionName: string): Provider[] => {
  const normalizedOptions: MongoOrmModuleOptions = {
    ...options,
    connectionName,
  };

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
      provide: getSeedRegistryToken(connectionName),
      useValue: seedRegistry,
    },
    {
      provide: getConnectionToken(connectionName),
      useFactory: (moduleOptions: MongoOrmModuleOptions, loggerFactory: LoggerFactory) =>
        new MongoConnection(moduleOptions, loggerFactory),
      inject: [getOptionsToken(connectionName), LoggerFactory],
    },
    {
      provide: getDatabaseToken(connectionName),
      useFactory: async (connection: MongoConnection) => {
        await connection.ensureConnection();
        return connection.getDatabase();
      },
      inject: [getConnectionToken(connectionName)],
    },
    {
      provide: getSeedRunnerToken(connectionName),
      useFactory: (
        connection: MongoConnection,
        registry: SeedRegistry,
        loggerFactory: LoggerFactory,
      ) => new SeedRunner(connection, registry, loggerFactory, connectionName),
      inject: [
        getConnectionToken(connectionName),
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
    useFactory: async (connection: MongoConnection) => {
      connection.registerEntity(entity);
      const metadata = getDocumentMetadata(entity);
      const collection = await connection.getCollection(entity);
      return new MongoRepository(collection, metadata);
    },
    inject: [getConnectionToken(connectionName)],
  }));

export class MongoOrmModule {
  static forRoot(options: MongoOrmModuleOptions): ClassType {
    const connectionName = normalizeConnectionName(options.connectionName);
    const providers = createRootProviders(options, connectionName);

    const exports = providers.map((provider) =>
      typeof provider === 'function' ? provider : provider.provide,
    );

    @Module({
      providers,
      exports,
    })
    class MongoOrmRootModule {}

    return MongoOrmRootModule;
  }

  static forFeature(
    entitiesOrOptions: MongoOrmFeatureOptions | DocumentClass[],
  ): ClassType {
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
    class MongoOrmFeatureModule {}

    return MongoOrmFeatureModule;
  }
}
