import type { OnModuleInit } from '@nl-framework/core';
import { LoggerFactory, Logger } from '@nl-framework/logger';
import type {
  SeedClass,
  SeederContext,
  SeedHistoryStore,
} from '../interfaces/seeding';
import type { DocumentClass } from '../interfaces/document';
import { getDocumentMetadata } from '../decorators/document';
import type { OrmRepository } from '../interfaces/repository';
import type { OrmConnection, OrmDriver } from '../interfaces/driver';
import { getSeedMetadata } from '../decorators/seed';

export interface SeedRegistry {
  seeds: SeedClass[];
  autoRun: boolean;
  environment: string;
}

export class SeedRunner implements OnModuleInit {
  private readonly logger: Logger;

  constructor(
    private readonly connection: OrmConnection,
    private readonly driver: OrmDriver,
    private readonly registry: SeedRegistry,
    private readonly history: SeedHistoryStore,
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

    const environment = this.registry.environment;

    const descriptors = seeds.map((seed) => ({
      seed,
      metadata: getSeedMetadata(seed),
    }));

    const candidates = descriptors.filter(({ metadata }) =>
      metadata.connections.includes(this.connectionName),
    );

    if (!candidates.length) {
      this.logger.info('No seeds applicable to connection', {
        connection: this.connectionName,
        seeds: seeds.map((seed) => seed.name),
      });
      return;
    }

    const context: SeederContext = {
      connectionName: this.connectionName,
      getRepository: async <T extends object>(
        document: DocumentClass<T>,
      ) => this.createRepository(document),
    };

    this.logger.info('Running seed set', {
      connection: this.connectionName,
      driver: this.driver.name,
      count: candidates.length,
      environment,
    });

    const executed: string[] = [];
    const skipped: string[] = [];

    for (const { seed: seedClass, metadata } of candidates) {
      if (metadata.environments && !metadata.environments.includes(environment)) {
        this.logger.debug('Skipping seed due to environment mismatch', {
          seed: metadata.name,
          environments: metadata.environments,
          environment,
        });
        skipped.push(metadata.name);
        continue;
      }

      const alreadyExecuted = await this.history.wasExecuted(
        metadata.id,
        environment,
        this.connectionName,
      );

      if (alreadyExecuted) {
        this.logger.debug('Skipping seed - already executed', {
          seed: metadata.name,
          environment,
          connection: this.connectionName,
        });
        skipped.push(metadata.name);
        continue;
      }

      const seedInstance = new seedClass();
      this.logger.info('Executing seed', {
        seed: metadata.name,
        connection: this.connectionName,
        environment,
      });

      const start = Date.now();
      await seedInstance.run(context);
      const durationMs = Date.now() - start;

      await this.history.markExecuted({
        seedId: metadata.id,
        connectionName: this.connectionName,
        environment,
        ranAt: new Date(),
        durationMs,
      });

      executed.push(metadata.name);
    }

    this.logger.info('Seed execution complete', {
      connection: this.connectionName,
      executed,
      skipped,
      environment,
    });
  }

  private async createRepository<T extends object>(
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
