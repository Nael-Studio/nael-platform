import type { ClassType, Token } from '@nl-framework/core';
import type { DocumentClass } from './document';
import type { OrmDriver } from './driver';
import type { SeedClass } from './seeding';
import type { Migration } from './migration';
import type { QueryObserver } from '../observability/query-observer';

export interface OrmModuleOptions {
  driver: OrmDriver;
  connectionName?: string;
  /** Alias for `connectionName` — the named connection this configuration owns. */
  name?: string;
  entities?: DocumentClass[];
  seeds?: SeedClass[];
  autoRunSeeds?: boolean;
  seedEnvironment?: string;
  /** Ordered migrations exposed via the `MigrationRunner` provider. */
  migrations?: Migration[];
  /**
   * Read-query observers, notified with the **filter shape** (never values) after
   * each `find`/`findOne`/`count`/`aggregate`. The ORM never depends on its
   * observers — devtools registers one here. Registered on module init.
   */
  observers?: QueryObserver[];
}

export interface OrmFeatureOptions {
  entities: DocumentClass[];
  connectionName?: string;
}

export interface OrmOptionsFactory {
  createOrmOptions(): Promise<OrmModuleOptions> | OrmModuleOptions;
}

export interface OrmModuleAsyncOptions {
  connectionName?: string;
  /** Alias for `connectionName`. */
  name?: string;
  imports?: ClassType[];
  useExisting?: ClassType<OrmOptionsFactory>;
  useClass?: ClassType<OrmOptionsFactory>;
  useFactory?: (...args: any[]) => Promise<OrmModuleOptions> | OrmModuleOptions;
  inject?: Token[];
}
