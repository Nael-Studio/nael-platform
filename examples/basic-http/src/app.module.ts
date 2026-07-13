import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { Module } from '@nl-framework/core';
import { ConfigModule } from '@nl-framework/config';
import { OpenApiModule } from '@nl-framework/openapi';
import { GreetingController } from './greeting.controller';
import { GreetingService } from './greeting.service';
import { RootController } from './root.controller';

const configDir = resolve(dirname(fileURLToPath(import.meta.url)), '../config');

@Module({
  imports: [
    ConfigModule.forRoot({
      dir: configDir,
    }),
    // OpenAPI is generated from the existing route metadata — no decorator
    // changes required. JSON at /openapi.json, viewer at /docs.
    OpenApiModule.forRoot({
      title: 'Basic HTTP Example API',
      version: '1.0.0',
      description: 'Controllers, providers, and configuration — documented automatically.',
    }),
  ],
  controllers: [RootController, GreetingController],
  providers: [GreetingService],
  exports: [],
})
export class AppModule {}
