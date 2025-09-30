import type { AdapterFactory } from 'better-auth/adapters';
import { mongodbAdapter, type MongoDBAdapterConfig } from 'better-auth/adapters/mongodb';
import type { Db } from 'mongodb';
import type { OrmConnection } from '@nl-framework/orm';

const isMongoDatabase = (value: unknown): value is Db =>
  Boolean(value && typeof (value as Db).collection === 'function');

export const createMongoAdapterFromDb = (
  db: Db,
  config?: MongoDBAdapterConfig,
): AdapterFactory => mongodbAdapter(db, config);

export const resolveMongoDatabase = async (connection: OrmConnection): Promise<Db> => {
  await connection.ensureConnection();
  const database = connection.getDatabase();

  if (!isMongoDatabase(database)) {
    throw new Error('The resolved database is not a MongoDB instance. Ensure the ORM driver is MongoDB.');
  }

  return database;
};

export const createMongoAdapterFromOrm = async (
  connection: OrmConnection,
  config?: MongoDBAdapterConfig,
): Promise<AdapterFactory> => mongodbAdapter(await resolveMongoDatabase(connection), config);
