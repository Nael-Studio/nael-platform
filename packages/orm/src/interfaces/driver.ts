import type { OnModuleDestroy, OnModuleInit } from '@nl-framework/core';
import type { LoggerFactory } from '@nl-framework/logger';
import type { DocumentClass, DocumentMetadata } from './document';
import type { OrmRepository } from './repository';

export interface OrmConnection extends OnModuleInit, OnModuleDestroy {
  registerEntity(entity: DocumentClass): void;
  getRegisteredEntities(): DocumentMetadata[];
  ensureConnection(): Promise<void>;
  getDatabase(): unknown;
}

export interface OrmDriver {
  readonly name: string;
  createConnection(connectionName: string, loggerFactory: LoggerFactory): OrmConnection;
  createRepository<T extends Record<string, unknown>>(
    connection: OrmConnection,
    entity: DocumentClass<T>,
  ): Promise<OrmRepository<T>>;
}
