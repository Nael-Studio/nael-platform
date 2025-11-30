import { Inject, Injectable } from '@nl-framework/core';
import { Logger, LoggerFactory } from '@nl-framework/logger';
import { betterAuth, type BetterAuthOptions, type BetterAuthPlugin } from 'better-auth';
import type { Adapter, AdapterFactory } from 'better-auth/adapters';
import type { BetterAuthInstance, BetterAuthSessionPayload } from './types';
import type { BetterAuthSessionOptions } from './service';
import type {
  BetterAuthMultiTenantCacheOptions,
  BetterAuthMultiTenantOptions,
  BetterAuthTenantContext,
  BetterAuthTenantResolution,
  BetterAuthTenantResolver,
  BetterAuthTenantConfigLoader,
} from './interfaces/multi-tenant-options';
import { BETTER_AUTH_MULTI_TENANT_OPTIONS } from './constants';
import { buildPluginList, normalizeModuleOptions, type NormalizedBetterAuthModuleOptions } from './utils/options';
import { getGlobalPlugins } from './constants';

interface TenantEntry {
  instance: BetterAuthInstance;
  options: NormalizedBetterAuthModuleOptions;
  createdAt: number;
  lastUsedAt: number;
}

const DEFAULT_CACHE: Required<BetterAuthMultiTenantCacheOptions> = {
  ttlMs: 5 * 60 * 1000,
  maxEntries: 100,
};

const resolveResolver = async (
  resolver: BetterAuthTenantResolver,
  context: BetterAuthTenantContext,
): Promise<BetterAuthTenantResolution | null> => {
  if (typeof resolver === 'function') {
    return resolver(context);
  }
  return resolver.resolve(context);
};

const resolveLoader = async (
  loader: BetterAuthTenantConfigLoader,
  tenant: BetterAuthTenantResolution,
  context: BetterAuthTenantContext,
) => loader.load(tenant, context);

@Injectable()
export class BetterAuthMultiTenantService {
  private readonly logger: Logger;
  private readonly registry = new Map<string, TenantEntry>();
  private readonly cache: Required<BetterAuthMultiTenantCacheOptions>;
  private readonly extraPlugins: BetterAuthPlugin[];
  private readonly resolver: BetterAuthTenantResolver;
  private readonly loader: BetterAuthTenantConfigLoader;
  private readonly deriveCookiePrefix?: BetterAuthMultiTenantOptions['deriveCookiePrefix'];

  constructor(
    @Inject(BETTER_AUTH_MULTI_TENANT_OPTIONS) options: BetterAuthMultiTenantOptions,
    loggerFactory: LoggerFactory,
  ) {
    this.logger = loggerFactory.create({ context: 'BetterAuthMultiTenantService' });
    this.cache = { ...DEFAULT_CACHE, ...(options.cache ?? {}) };
    this.extraPlugins = options.extendPlugins ?? [];
    this.resolver = options.resolver;
    this.loader = options.loader;
    this.deriveCookiePrefix = options.deriveCookiePrefix;
  }

  async getInstance(context: BetterAuthTenantContext): Promise<BetterAuthInstance> {
    const resolution = await resolveResolver(this.resolver, context);
    if (!resolution?.tenantKey) {
      throw new Error('BetterAuthMultiTenantService could not resolve tenant for the incoming request.');
    }

    return this.getOrCreateInstance(resolution, context);
  }

  async getInstanceForTenant(
    resolution: BetterAuthTenantResolution,
    context: BetterAuthTenantContext = {},
  ): Promise<BetterAuthInstance> {
    if (!resolution?.tenantKey) {
      throw new Error('BetterAuthMultiTenantService requires a tenantKey when using getInstanceForTenant.');
    }

    return this.getOrCreateInstance(resolution, context);
  }

  private async getOrCreateInstance(
    resolution: BetterAuthTenantResolution,
    context: BetterAuthTenantContext,
  ): Promise<BetterAuthInstance> {
    const tenantKey = resolution.tenantKey;
    const now = Date.now();
    const cached = this.registry.get(tenantKey);

    if (cached && !this.isExpired(cached, now)) {
      cached.lastUsedAt = now;
      return cached.instance;
    }

    const options = await resolveLoader(this.loader, resolution, context);
    const normalized = normalizeModuleOptions(options);
    const cookiePrefix =
      normalized.betterAuth.advanced?.cookiePrefix ??
      this.optionsCookiePrefix(resolution.tenantKey, context);
    const plugins = buildPluginList(normalized, getGlobalPlugins(), this.extraPlugins);

    const config = {
      ...normalized.betterAuth,
    } as BetterAuthOptions & {
      adapter?: Adapter | AdapterFactory;
      database?: BetterAuthOptions['database'];
      plugins?: BetterAuthPlugin[];
    };

    if (cookiePrefix) {
      config.advanced = { ...(config.advanced ?? {}), cookiePrefix };
    }

    if (config.database === undefined) {
      config.database = normalized.database;
    }

    if (config.adapter === undefined && normalized.adapter) {
      config.adapter = normalized.adapter;
    }

    config.plugins = plugins;

    const instance = betterAuth(config);

    if (normalized.autoRunMigrations) {
      await this.runMigrations(instance, tenantKey);
    }

    this.pruneExpired(now);
    this.registry.set(tenantKey, {
      instance,
      options: normalized,
      createdAt: now,
      lastUsedAt: now,
    });
    this.enforceMaxEntries();

    this.logger.info('Initialized Better Auth tenant instance', {
      tenant: tenantKey,
      plugins: plugins.length,
      autoRunMigrations: normalized.autoRunMigrations,
    });

    return instance;
  }

  async handle(request: Request, context: BetterAuthTenantContext = {}): Promise<Response> {
    const instance = await this.getInstance({ ...context, request, headers: request.headers });
    return instance.handler(request);
  }

  async getSession(
    input: Request | Headers,
    context: BetterAuthTenantContext = {},
    options: BetterAuthSessionOptions = {},
  ): Promise<BetterAuthSessionPayload | null> {
    const headers = input instanceof Request ? input.headers : input;
    const instance = await this.getInstance({ ...context, headers });
    const query = options.disableCookieCache || options.disableRefresh
      ? {
          disableCookieCache: options.disableCookieCache,
          disableRefresh: options.disableRefresh,
        }
      : undefined;

    const args = { headers } as Parameters<BetterAuthInstance['api']['getSession']>[0] & { query?: typeof query };
    if (query) {
      args.query = query;
    }

    return (await instance.api.getSession(args)) as BetterAuthSessionPayload | null;
  }

  async getSessionOrNull(
    input: Request | Headers,
    context: BetterAuthTenantContext = {},
    options: BetterAuthSessionOptions = {},
  ): Promise<BetterAuthSessionPayload | null> {
    try {
      return await this.getSession(input, context, options);
    } catch (error) {
      const message = error instanceof Error ? `${error.name}: ${error.message}` : 'Unknown error';
      this.logger.warn('Failed to resolve Better Auth tenant session', { error: message });
      return null;
    }
  }

  clear(): void {
    this.registry.clear();
  }

  private isExpired(entry: TenantEntry, now: number): boolean {
    return this.cache.ttlMs > 0 ? now - entry.lastUsedAt > this.cache.ttlMs : false;
  }

  private pruneExpired(now: number): void {
    for (const [key, entry] of this.registry.entries()) {
      if (this.isExpired(entry, now)) {
        this.registry.delete(key);
      }
    }
  }

  private enforceMaxEntries(): void {
    if (this.cache.maxEntries <= 0 || this.registry.size <= this.cache.maxEntries) {
      return;
    }

    const sorted = Array.from(this.registry.entries()).sort(
      (a, b) => a[1].lastUsedAt - b[1].lastUsedAt,
    );

    const excess = this.registry.size - this.cache.maxEntries;
    for (let i = 0; i < excess; i += 1) {
      this.registry.delete(sorted[i][0]);
    }
  }

  private async runMigrations(instance: BetterAuthInstance, tenantKey: string): Promise<void> {
    const context = (instance as { context?: { runMigrations?: () => Promise<void> } }).context;
    if (!context?.runMigrations) {
      return;
    }

    try {
      await context.runMigrations();
    } catch (error) {
      const message = error instanceof Error ? `${error.name}: ${error.message}` : 'Unknown migration failure';
      this.logger.warn('Failed to run Better Auth migrations for tenant', {
        tenant: tenantKey,
        error: message,
      });
    }
  }

  private optionsCookiePrefix(
    tenantKey: string,
    context: BetterAuthTenantContext,
  ): string | null | undefined {
    return this.deriveCookiePrefix?.(tenantKey, context);
  }
}
