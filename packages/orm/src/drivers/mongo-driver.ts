import type { MongoClientOptions } from 'mongodb';
import type { OrmConnection, OrmDriver, SeedHistoryFactoryOptions } from '../interfaces/driver';
import type { DocumentClass } from '../interfaces/document';
import { getDocumentMetadata } from '../decorators/document';
import { MongoConnection, type MongoConnectionOptions } from '../connection/mongo-connection';
import { MongoRepository } from '../repository/mongo-repository';
import { MongoSeedHistoryStore, type MongoSeedHistoryStoreOptions } from './mongo-seed-history-store';

export interface MongoDriverOptions {
  uri: string;
  dbName?: string;
  clientOptions?: MongoClientOptions;
  seedHistory?: MongoSeedHistoryStoreOptions;
}

const createConnectionOptions = (
  options: MongoDriverOptions,
  connectionName: string,
): MongoConnectionOptions => ({
  ...options,
  connectionName,
});

export const createMongoDriver = (options: MongoDriverOptions): OrmDriver => ({
  name: 'mongo',
  createConnection: (connectionName, loggerFactory) =>
    new MongoConnection(createConnectionOptions(options, connectionName), loggerFactory),
  createRepository: async <T extends Record<string, unknown>>(
    connection: OrmConnection,
    entity: DocumentClass<T>,
  ) => {
    const mongoConnection = connection as MongoConnection;
    mongoConnection.registerEntity(entity);
    const metadata = getDocumentMetadata(entity);
    const collection = await mongoConnection.getCollection<T>(entity);
    return new MongoRepository<T>(collection, metadata);
  },
  createSeedHistory: async (
    connection: OrmConnection,
    _factoryOptions: SeedHistoryFactoryOptions,
  ) => {
    const mongoConnection = connection as MongoConnection;
    return new MongoSeedHistoryStore(mongoConnection, options.seedHistory);
  },
});
