import type { MongoClientOptions } from 'mongodb';
import type { DocumentClass } from './document';
import type { SeedClass } from './seeding';

export interface MongoOrmConnectionOptions {
  uri: string;
  dbName?: string;
  clientOptions?: MongoClientOptions;
  connectionName?: string;
}

export interface MongoOrmModuleOptions extends MongoOrmConnectionOptions {
  entities?: DocumentClass[];
  seeds?: SeedClass[];
  autoRunSeeds?: boolean;
}

export interface MongoOrmFeatureOptions {
  entities: DocumentClass[];
  connectionName?: string;
}
