import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Module, ConfigService } from '@nl-framework/core';
import { ConfigModule } from '@nl-framework/config';
import { OrmModule, createMongoDriver, getDatabaseToken } from '@nl-framework/orm';
import { BetterAuthModule, BetterAuthHttpModule, createMongoAdapterFromDb, AuthGuard } from '@nl-framework/auth';
import type { Db } from 'mongodb';
import { username } from 'better-auth/plugins/username';
import type { ExampleConfig } from './types';
import { RootController } from './root.controller';
import { AuthController } from './auth.controller';
import { ProfileController } from './profile.controller';

const DEFAULT_MONGO_URI = process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/nl-framework-auth-example';
const DEFAULT_MONGO_DB = process.env.MONGODB_DB ?? 'nl-framework-auth-example';

const configDir = resolve(dirname(fileURLToPath(import.meta.url)), '../config');

@Module({
  imports: [
    ConfigModule.forRoot({ dir: configDir }),
    OrmModule.forRoot({
      driver: createMongoDriver({
        uri: DEFAULT_MONGO_URI,
        dbName: DEFAULT_MONGO_DB,
      }),
    }),
    BetterAuthModule.forRootAsync({
      inject: [ConfigService, getDatabaseToken()],
      useFactory: async (config: ConfigService<ExampleConfig>, db: Db) => {
        const secret = process.env.BETTER_AUTH_SECRET ?? config.get('auth.secret');
        if (!secret || secret === 'change-me-in-env') {
          throw new Error(
            'Better Auth secret is missing. Set BETTER_AUTH_SECRET or update config/auth.secret with a secure value.',
          );
        }

        return {
          betterAuth: {
            secret,
            emailAndPassword: {
              enabled: true,
            },
          },
          adapter: createMongoAdapterFromDb(db),
          extendPlugins: [username()],
        };
      },
    }),
    BetterAuthHttpModule.registerAsync({
      inject: [ConfigService],
      useFactory: (...args: unknown[]) => {
        const [config] = args as [ConfigService<ExampleConfig>];
        return {
          prefix: config.get('auth.routePrefix', '/api/auth') as string,
        };
      },
    }),
  ],
  controllers: [RootController, AuthController, ProfileController],
  providers: [AuthGuard],
})
export class AppModule {}
