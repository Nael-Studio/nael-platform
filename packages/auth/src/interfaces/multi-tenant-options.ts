import type { BetterAuthPlugin } from 'better-auth';
import type { ClassType, Token } from '@nl-framework/core';
import type { BetterAuthModuleOptions } from './module-options';

export interface BetterAuthTenantResolution {
  tenantKey: string;
  /**
   * Optional metadata to carry information from the resolver into the loader.
   * Useful for reusing parsed host/headers without re-computing inside the loader.
   */
  context?: Record<string, unknown>;
}

export interface BetterAuthTenantContext {
  request?: Request;
  headers?: Headers;
  graphqlContext?: unknown;
}

export type BetterAuthTenantResolver =
  | ((context: BetterAuthTenantContext) => Promise<BetterAuthTenantResolution | null> | BetterAuthTenantResolution | null)
  | { resolve: (context: BetterAuthTenantContext) => Promise<BetterAuthTenantResolution | null> | BetterAuthTenantResolution | null };

export interface BetterAuthTenantConfigLoader {
  load(
    tenant: BetterAuthTenantResolution,
    context: BetterAuthTenantContext,
  ): Promise<BetterAuthModuleOptions> | BetterAuthModuleOptions;
}

export interface BetterAuthMultiTenantCacheOptions {
  ttlMs?: number;
  maxEntries?: number;
}

export interface BetterAuthMultiTenantOptions {
  resolver: BetterAuthTenantResolver;
  loader: BetterAuthTenantConfigLoader;
  cache?: BetterAuthMultiTenantCacheOptions;
  extendPlugins?: BetterAuthPlugin[];
  /**
   * Optional function to derive a per-tenant cookie prefix when the loader does not set one.
   * Returning a string will set `betterAuth.advanced.cookiePrefix` to that value.
   */
  deriveCookiePrefix?: (tenantKey: string, context: BetterAuthTenantContext) => string | null | undefined;
}

export interface BetterAuthMultiTenantOptionsFactory {
  createBetterAuthMultiTenantOptions():
    | Promise<BetterAuthMultiTenantOptions>
    | BetterAuthMultiTenantOptions;
}

export interface BetterAuthMultiTenantModuleAsyncOptions {
  imports?: ClassType[];
  useExisting?: ClassType<BetterAuthMultiTenantOptionsFactory>;
  useClass?: ClassType<BetterAuthMultiTenantOptionsFactory>;
  useFactory?: (...args: any[]) => Promise<BetterAuthMultiTenantOptions> | BetterAuthMultiTenantOptions;
  inject?: Token[];
}
