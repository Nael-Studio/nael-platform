import { Module } from '@nl-framework/core';
import { GreetingController } from './controllers/greeting.controller';
import { GreetingService } from './services/greeting.service';

@Module({
  providers: [GreetingService],
  controllers: [GreetingController],
})
export class AppModule {}
