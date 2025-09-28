import type { ClassType } from '@nl-framework/core';
import type { DocumentClass } from './document';
import type { OrmRepository } from './repository';

export interface SeederContext {
  connectionName: string;
  getRepository<T extends Record<string, unknown>>(
    document: DocumentClass<T>,
  ): Promise<OrmRepository<T>>;
}

export interface Seeder {
  run(context: SeederContext): Promise<void>;
}

export type SeedClass = ClassType<Seeder>;
