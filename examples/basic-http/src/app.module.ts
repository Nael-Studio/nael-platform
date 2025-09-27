import { Module } from '@nl-framework/core';
import { GreetingController } from './greeting.controller';
import { GreetingService } from './greeting.service';
import { RootController } from './root.controller';

@Module({
  imports: [],
  controllers: [RootController, GreetingController],
  providers: [GreetingService],
  exports: [],
})
export class AppModule {}
