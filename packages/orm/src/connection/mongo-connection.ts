import {
  MongoClient,
  type ClientSession,
  type ClientSessionOptions,
  type Collection,
  type Db,
  type MongoClientOptions,
  type TransactionOptions,
} from 'mongodb';
import { LoggerFactory, Logger } from '@nl-framework/logger';
import type { DocumentClass, DocumentMetadata, BaseDocument } from '../interfaces/document';
import { getDocumentMetadata } from '../decorators/document';
import { normalizeConnectionName } from '../constants';
import type { OrmConnection } from '../interfaces/driver';
import { WriteNotifier, type EntityWriteListener } from '../events/write-notifier';

export interface MongoConnectionOptions {
  uri: string;
  dbName?: string;
  clientOptions?: MongoClientOptions;
  connectionName: string;
  /** Create all indexes declared via `@Index` / `@Document({ indexes })` right after connecting. */
  autoIndex?: boolean;
}

export interface WithTransactionOptions {
  session?: ClientSessionOptions;
  transaction?: TransactionOptions;
}

const sanitizeUri = (uri: string): string => {
  try {
    const url = new URL(uri);
    url.password = url.password ? '***' : '';
    return url.toString();
  } catch {
    return uri;
  }
};

export class MongoConnection implements OrmConnection {
  private client?: MongoClient;
  private database?: Db;
  private readonly entities = new Set<DocumentClass>();
  private readonly logger: Logger;
  private readonly writeNotifier: WriteNotifier;

  constructor(
    private readonly options: MongoConnectionOptions,
    loggerFactory: LoggerFactory,
  ) {
    const connectionName = normalizeConnectionName(options.connectionName);
    this.logger = loggerFactory.create({ context: `MongoConnection(${connectionName})` });
    this.writeNotifier = new WriteNotifier(connectionName, this.logger);
  }

  getWriteNotifier(): WriteNotifier {
    return this.writeNotifier;
  }

  /** Subscribe to write events from every repository on this connection. Returns an unsubscribe function. */
  onWrite(listener: EntityWriteListener): () => void {
    return this.writeNotifier.onWrite(listener);
  }

  registerEntity(entity: DocumentClass): void {
    this.entities.add(entity);
  }

  getRegisteredEntities(): DocumentMetadata[] {
    return Array.from(this.entities).map((entity) => getDocumentMetadata(entity));
  }

  async onModuleInit(): Promise<void> {
    await this.ensureConnection();
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.logger.info('MongoDB connection closed');
      this.client = undefined;
      this.database = undefined;
    }
  }

  async ensureConnection(): Promise<void> {
    if (this.client && this.database) {
      return;
    }

    const client = new MongoClient(this.options.uri, this.options.clientOptions);
    await client.connect();

    const dbName = this.options.dbName ?? client.db().databaseName;
    const database = client.db(dbName);

    this.client = client;
    this.database = database;

    this.logger.info('MongoDB connection established', {
      uri: sanitizeUri(this.options.uri),
      db: dbName,
      entities: this.entities.size,
    });

    if (this.options.autoIndex) {
      await this.ensureIndexes();
    }
  }

  /**
   * Create every index declared on registered entities (via `@Index` or
   * `@Document({ indexes })`). Fails loud: the first index that cannot be
   * created throws instead of being swallowed.
   */
  async ensureIndexes(): Promise<void> {
    await this.ensureConnection();
    const db = this.getDatabase();

    for (const metadata of this.getRegisteredEntities()) {
      if (!metadata.indexes.length) {
        continue;
      }
      const collection = db.collection(metadata.collection);
      for (const index of metadata.indexes) {
        try {
          const name = await collection.createIndex(index.keys, index.options ?? {});
          this.logger.debug(`Ensured index ${name} on ${metadata.collection}`);
        } catch (error) {
          throw new Error(
            `Failed to create index ${JSON.stringify(index.keys)} on collection "${metadata.collection}": ${
              error instanceof Error ? error.message : String(error)
            }`,
            { cause: error },
          );
        }
      }
    }
  }

  async startSession(options?: ClientSessionOptions): Promise<ClientSession> {
    await this.ensureConnection();
    return this.getClient().startSession(options);
  }

  /**
   * Run `fn` inside a MongoDB transaction. The session must be passed to every
   * repository call inside the callback (all read/write methods accept a
   * `session` option). The session is always ended, and the callback's return
   * value is returned once the transaction commits.
   */
  async withTransaction<T>(
    fn: (session: ClientSession) => Promise<T>,
    options: WithTransactionOptions = {},
  ): Promise<T> {
    const session = await this.startSession(options.session);
    try {
      return await session.withTransaction(async () => fn(session), options.transaction);
    } finally {
      await session.endSession();
    }
  }

  getClient(): MongoClient {
    if (!this.client) {
      throw new Error('Mongo connection not yet initialized. Call ensureConnection() first.');
    }
    return this.client;
  }

  getDatabase(): Db {
    if (!this.database) {
      throw new Error('Mongo connection not yet initialized. Call ensureConnection() first.');
    }
    return this.database;
  }

  async getCollection<T extends object>(
    document: DocumentClass<T>,
  ): Promise<Collection<T & BaseDocument>> {
    await this.ensureConnection();
    const metadata = getDocumentMetadata(document);
    const db = this.getDatabase();
    return db.collection<T & BaseDocument>(metadata.collection);
  }
}
