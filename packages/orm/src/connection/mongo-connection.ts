import { MongoClient, type Db, type Collection } from 'mongodb';
import type { OnModuleInit, OnModuleDestroy } from '@nl-framework/core';
import { LoggerFactory, Logger } from '@nl-framework/logger';
import type { DocumentClass, DocumentMetadata, BaseDocument } from '../interfaces/document';
import type { MongoOrmModuleOptions } from '../interfaces/module-options';
import { getDocumentMetadata } from '../decorators/document';
import { normalizeConnectionName } from '../constants';

const sanitizeUri = (uri: string): string => {
  try {
    const url = new URL(uri);
    url.password = url.password ? '***' : '';
    return url.toString();
  } catch {
    return uri;
  }
};

export class MongoConnection implements OnModuleInit, OnModuleDestroy {
  private client?: MongoClient;
  private database?: Db;
  private readonly entities = new Set<DocumentClass>();
  private readonly logger: Logger;

  constructor(
    private readonly options: MongoOrmModuleOptions,
    loggerFactory: LoggerFactory,
  ) {
    const connectionName = normalizeConnectionName(options.connectionName);
    this.logger = loggerFactory.create({ context: `MongoConnection(${connectionName})` });
    options.entities?.forEach((entity) => this.registerEntity(entity));
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

  async getCollection<T extends Record<string, unknown>>(
    document: DocumentClass<T>,
  ): Promise<Collection<T & BaseDocument>> {
    await this.ensureConnection();
    const metadata = getDocumentMetadata(document);
    const db = this.getDatabase();
    return db.collection<T & BaseDocument>(metadata.collection);
  }
}
