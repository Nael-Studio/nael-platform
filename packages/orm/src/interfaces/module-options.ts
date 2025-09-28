import type { DocumentClass } from './document';
import type { OrmDriver } from './driver';
import type { SeedClass } from './seeding';

export interface OrmModuleOptions {
  driver: OrmDriver;
  connectionName?: string;
  entities?: DocumentClass[];
  seeds?: SeedClass[];
  autoRunSeeds?: boolean;
}

export interface OrmFeatureOptions {
  entities: DocumentClass[];
  connectionName?: string;
}
