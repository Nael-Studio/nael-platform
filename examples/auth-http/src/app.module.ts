import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { Module } from '@nl-framework/core';
import { ConfigModule, ConfigService } from '@nl-framework/config';
import { AuthModule } from '@nl-framework/auth';
import { AuthController } from './auth.controller';
import { ProtectedController } from './protected.controller';
import type { AuthExampleConfig } from './types';

const configDir = resolve(dirname(fileURLToPath(import.meta.url)), '../config');
const ConfigRootModule = ConfigModule.forRoot({
  dir: configDir,
});

@Module({
  imports: [
    ConfigRootModule,
    AuthModule.forRootAsync({
      imports: [ConfigRootModule],
      inject: [ConfigService],
      useFactory: async (...args: unknown[]) => {
        const [config] = args as [ConfigService<AuthExampleConfig>];
        return {
          defaultUsers: config.get('app.defaultUsers', []),
          config: {
            sessionTtlMs: 1000 * 60 * 60, // 1 hour sessions for the demo
          },
        };
      },
    }),
  ],
  controllers: [AuthController, ProtectedController],
})
export class AppModule {}
