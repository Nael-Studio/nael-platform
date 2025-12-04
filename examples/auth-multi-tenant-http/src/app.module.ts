import { Module } from '@nl-framework/core';
import { OrmModule, createMongoDriver, getDatabaseToken } from '@nl-framework/orm';
import {
  BetterAuthHttpModule,
  BetterAuthMultiTenantModule,
  MultiTenantAuthGuard,
} from '@nl-framework/auth';
import type { Db } from 'mongodb';
import { TenantConfigService } from './tenant-config.service';
import { TenantController } from './tenant.controller';
import { ProfileController } from './profile.controller';

const DEFAULT_MONGO_URI = process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017';
const DEFAULT_MONGO_DB = process.env.MONGODB_DB ?? 'nael-mt-root';

@Module({
  imports: [
    OrmModule.forRoot({
      driver: createMongoDriver({
        uri: DEFAULT_MONGO_URI,
        dbName: DEFAULT_MONGO_DB,
      }),
    }),
    BetterAuthMultiTenantModule.registerAsync({
      imports: [OrmModule],
      inject: [TenantConfigService, getDatabaseToken()],
      useFactory: async (tenantConfig: TenantConfigService, db: Db) => ({
        resolver: {
          resolve: ({ headers }) => {
            const tenant = headers?.get('x-tenant-id') ?? 'default';
            return tenant ? { tenantKey: tenant } : null;
          },
        },
        loader: {
          load: ({ tenantKey }) => tenantConfig.load(tenantKey, db),
        },
        deriveCookiePrefix: (tenantKey) => `mt-${tenantKey}`,
        cache: { ttlMs: 5 * 60_000, maxEntries: 50 },
      }),
    }),
    BetterAuthHttpModule.register({
      prefix: '/api/auth',
    }),
  ],
  controllers: [TenantController, ProfileController],
  providers: [TenantConfigService, MultiTenantAuthGuard],
})
export class AppModule {}
