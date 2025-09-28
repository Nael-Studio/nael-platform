import type { ClassType, Token } from '@nl-framework/core';
import type { DocumentClass } from './document';
import type { OrmDriver } from './driver';
import type { SeedClass } from './seeding';

export interface OrmModuleOptions {
  driver: OrmDriver;
  connectionName?: string;
  entities?: DocumentClass[];
  seeds?: SeedClass[];
  autoRunSeeds?: boolean;
  seedEnvironment?: string;
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
  imports?: ClassType[];
  useExisting?: ClassType<OrmOptionsFactory>;
  useClass?: ClassType<OrmOptionsFactory>;
  useFactory?: (...args: any[]) => Promise<OrmModuleOptions> | OrmModuleOptions;
  inject?: Token[];
}
