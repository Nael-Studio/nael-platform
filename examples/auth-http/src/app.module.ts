import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { Module } from '@nl-framework/core';
import { ConfigModule, ConfigService } from '@nl-framework/config';
import { AuthModule } from '@nl-framework/auth';
import { OrmModule, createMongoDriver, getRepositoryToken } from '@nl-framework/orm';
import type { OrmRepository } from '@nl-framework/orm';
import { AuthController } from './auth.controller';
import { ProtectedController } from './protected.controller';
import type { AuthExampleConfig } from './types';
import { OrmBetterAuthAdapter } from './persistence/orm-better-auth.adapter';
import { AuthUserDocument } from './persistence/auth-user.document';

const configDir = resolve(dirname(fileURLToPath(import.meta.url)), '../config');
const ConfigRootModule = ConfigModule.forRoot({
  dir: configDir,
});

const OrmRootModule = OrmModule.forRootAsync({
  imports: [ConfigRootModule],
  inject: [ConfigService],
  useFactory: async (...args: unknown[]) => {
    const [config] = args as [ConfigService<AuthExampleConfig>];
    const uri = config.get('database.uri', 'mongodb://127.0.0.1:27017/nl-framework-auth-example');
    const dbName = config.get('database.dbName', 'nl-framework-auth-example');
    return {
      driver: createMongoDriver({
        uri,
        dbName,
      }),
      autoRunSeeds: false,
    };
  },
});

@Module({
  imports: [
    ConfigRootModule,
    OrmRootModule,
    AuthModule.forRootAsync({
      imports: [ConfigRootModule, OrmModule.forFeature([AuthUserDocument])],
      inject: [ConfigService, getRepositoryToken(AuthUserDocument)],
      useFactory: async (...args: unknown[]) => {
        const [config, users] = args as [
          ConfigService<AuthExampleConfig>,
          OrmRepository<AuthUserDocument>,
        ];

        return {
          instance: new OrmBetterAuthAdapter(users, {
            sessionTtlMs: config.get('auth.sessionTtlMs', 1000 * 60 * 60),
          }),
          defaultUsers: config.get('app.defaultUsers', []),
          autoSeed: true,
        };
      },
    }),
  ],
  controllers: [AuthController, ProtectedController],
})
export class AppModule {}
