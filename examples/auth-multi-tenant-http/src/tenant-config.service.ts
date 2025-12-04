import { Injectable } from '@nl-framework/core';
import { createMongoAdapterFromDb, type BetterAuthModuleOptions } from '@nl-framework/auth';
import type { Db } from 'mongodb';

type TenantRecord = {
  secretEnv: string;
  dbName: string;
  cookiePrefix?: string;
};

const DEFAULT_TENANTS: Record<string, TenantRecord> = {
  default: {
    secretEnv: 'BETTER_AUTH_SECRET_DEFAULT',
    dbName: 'nael-mt-default',
    cookiePrefix: 'mt-default',
  },
  acme: {
    secretEnv: 'BETTER_AUTH_SECRET_ACME',
    dbName: 'nael-mt-acme',
    cookiePrefix: 'mt-acme',
  },
};

@Injectable()
export class TenantConfigService {
  private tenants: Record<string, TenantRecord> = { ...DEFAULT_TENANTS };

  async load(tenantKey: string, db: Db): Promise<BetterAuthModuleOptions> {
    const tenant = this.tenants[tenantKey] ?? this.tenants.default ?? DEFAULT_TENANTS.default;
    if (!tenant) {
      throw new Error('No tenant configuration available (missing default tenant).');
    }
    const secret =
      process.env[tenant.secretEnv] ??
      process.env.BETTER_AUTH_SECRET ??
      `change-me-${tenantKey}`;

    const tenantDb = db.client?.db
      ? db.client.db(tenant.dbName)
      : null;
    if (!tenantDb) {
      throw new Error('Mongo client unavailable to resolve tenant database');
    }

    return {
      betterAuth: {
        secret,
        emailAndPassword: { enabled: true },
        advanced: { cookiePrefix: tenant.cookiePrefix ?? `mt-${tenantKey}` },
      },
      database: createMongoAdapterFromDb(tenantDb),
    };
  }
}
