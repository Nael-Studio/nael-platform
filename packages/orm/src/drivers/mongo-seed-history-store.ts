import type { Collection } from 'mongodb';
import type { SeedHistoryRecord, SeedHistoryStore } from '../interfaces/seeding';
import { MongoConnection } from '../connection/mongo-connection';

interface MongoSeedHistoryDocument {
  seedId: string;
  connectionName: string;
  environment: string;
  ranAt: Date;
  durationMs?: number;
}

export interface MongoSeedHistoryStoreOptions {
  collectionName?: string;
}

const DEFAULT_COLLECTION = 'orm_seed_history';

export class MongoSeedHistoryStore implements SeedHistoryStore {
  private collection?: Collection<MongoSeedHistoryDocument>;

  constructor(
    private readonly connection: MongoConnection,
    private readonly options: MongoSeedHistoryStoreOptions = {},
  ) {}

  private async getCollection(): Promise<Collection<MongoSeedHistoryDocument>> {
    if (this.collection) {
      return this.collection;
    }

    await this.connection.ensureConnection();
    const db = this.connection.getDatabase();
    const collectionName = this.options.collectionName ?? DEFAULT_COLLECTION;
    const collection = db.collection<MongoSeedHistoryDocument>(collectionName);

    await collection.createIndex(
      { seedId: 1, connectionName: 1, environment: 1 },
      { unique: true, name: 'orm_seed_history_identity' },
    );

    this.collection = collection;
    return collection;
  }

  async wasExecuted(seedId: string, environment: string, connectionName: string): Promise<boolean> {
    const collection = await this.getCollection();
    const existing = await collection.findOne({ seedId, environment, connectionName });
    return Boolean(existing);
  }

  async markExecuted(record: SeedHistoryRecord): Promise<void> {
    const collection = await this.getCollection();
    await collection.updateOne(
      {
        seedId: record.seedId,
        environment: record.environment,
        connectionName: record.connectionName,
      },
      {
        $set: {
          ranAt: record.ranAt,
          durationMs: record.durationMs,
        },
      },
      { upsert: true },
    );
  }
}
