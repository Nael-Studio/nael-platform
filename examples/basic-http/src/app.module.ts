import { Module } from '@nl-framework/core';
import { GreetingController } from './greeting.controller';
import { GreetingService } from './greeting.service';

@Module({
  imports: [],
  controllers: [GreetingController],
  providers: [GreetingService],
  exports: [],
})
export class AppModule {}
