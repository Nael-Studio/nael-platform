import type { BetterAuthOptions, Adapter, BetterAuthPlugin } from 'better-auth';
import type { AdapterFactory } from 'better-auth/adapters';
import type { ClassType, Token } from '@nl-framework/core';

export interface BetterAuthModuleOptions {
  betterAuth: BetterAuthOptions;
  connectionName?: string;
  adapter?: Adapter | AdapterFactory;
  database?: BetterAuthOptions['database'];
  extendPlugins?: BetterAuthPlugin[];
  autoRunMigrations?: boolean;
}

export interface BetterAuthOptionsFactory {
  createBetterAuthOptions(): Promise<BetterAuthModuleOptions> | BetterAuthModuleOptions;
}

export interface BetterAuthModuleAsyncOptions {
  imports?: ClassType[];
  useExisting?: ClassType<BetterAuthOptionsFactory>;
  useClass?: ClassType<BetterAuthOptionsFactory>;
  useFactory?: (...args: any[]) => Promise<BetterAuthModuleOptions> | BetterAuthModuleOptions;
  inject?: Token[];
}
