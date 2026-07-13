import type { BetterAuthOptions, BetterAuthPlugin } from 'better-auth';
import type { ClassType, Token } from '@nl-framework/core';
import type { BetterAuthAdapter, BetterAuthAdapterFactory } from '../types';
import type { AuthorizationOptions } from '../authorization/types';

export interface BetterAuthModuleOptions {
  betterAuth: BetterAuthOptions;
  connectionName?: string;
  adapter?: BetterAuthAdapter | BetterAuthAdapterFactory;
  database?: BetterAuthOptions['database'];
  extendPlugins?: BetterAuthPlugin[];
  autoRunMigrations?: boolean;
  /**
   * RBAC configuration for `@Roles`/`@Permissions` + `RolesGuard`. Pluggable role
   * and permission resolvers; defaults read Better Auth's `user.role`/`permissions`
   * and the active-org member role.
   */
  authorization?: AuthorizationOptions;
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
