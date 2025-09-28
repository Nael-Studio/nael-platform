import type { OnModuleInit } from '@nl-framework/core';
import { LoggerFactory, Logger } from '@nl-framework/logger';
import type { SeedClass, SeederContext } from '../interfaces/seeding';
import type { DocumentClass } from '../interfaces/document';
import { getDocumentMetadata } from '../decorators/document';
import type { OrmRepository } from '../interfaces/repository';
import type { OrmConnection, OrmDriver } from '../interfaces/driver';

export interface SeedRegistry {
  seeds: SeedClass[];
  autoRun: boolean;
}

export class SeedRunner implements OnModuleInit {
  private readonly logger: Logger;

  constructor(
    private readonly connection: OrmConnection,
    private readonly driver: OrmDriver,
    private readonly registry: SeedRegistry,
    loggerFactory: LoggerFactory,
    private readonly connectionName: string,
  ) {
    this.logger = loggerFactory.create({ context: `SeedRunner(${connectionName})` });
  }

  async onModuleInit(): Promise<void> {
    if (this.registry.autoRun && this.registry.seeds.length) {
      await this.run();
    }
  }

  async run(seeds: SeedClass[] = this.registry.seeds): Promise<void> {
    if (!seeds.length) {
      this.logger.info('No seeds registered', { connection: this.connectionName });
      return;
    }

    const context: SeederContext = {
      connectionName: this.connectionName,
      getRepository: async <T extends Record<string, unknown>>(
        document: DocumentClass<T>,
      ) => this.createRepository(document),
    };

    this.logger.info('Running seed set', {
      connection: this.connectionName,
      driver: this.driver.name,
      count: seeds.length,
    });

    for (const seedClass of seeds) {
      const seedInstance = new seedClass();
      this.logger.info('Executing seed', { seed: seedClass.name, connection: this.connectionName });
      await seedInstance.run(context);
    }

    this.logger.info('Seed execution complete', {
      connection: this.connectionName,
      seeds: seeds.map((seed) => seed.name),
    });
  }

  private async createRepository<T extends Record<string, unknown>>(
    document: DocumentClass<T>,
  ): Promise<OrmRepository<T>> {
    this.connection.registerEntity(document);
    const metadata = getDocumentMetadata(document);
    const repository = await this.driver.createRepository(this.connection, document);
    this.logger.debug('Prepared repository for seeding', {
      entity: metadata.target.name,
      collection: metadata.collection,
    });
    return repository;
  }
}
