import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { Module } from '@nl-framework/core';
import { ConfigModule } from '@nl-framework/config';
import { GreetingController } from './greeting.controller';
import { GreetingService } from './greeting.service';
import { RootController } from './root.controller';

const configDir = resolve(dirname(fileURLToPath(import.meta.url)), '../config');

@Module({
  imports: [
    ConfigModule.forRoot({
      dir: configDir,
    }),
  ],
  controllers: [RootController, GreetingController],
  providers: [GreetingService],
  exports: [],
})
export class AppModule {}
