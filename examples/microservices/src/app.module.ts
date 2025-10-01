import { Module } from '@nl-framework/core';
import { ConfigModule } from '@nl-framework/config';
import { createMicroservicesModule } from '@nl-framework/microservices';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { OrdersHttpController } from './orders-http.controller';

@Module({
  imports: [
    ConfigModule.forRoot(),
    createMicroservicesModule({
      controllers: [OrdersController],
    }),
  ],
  controllers: [OrdersHttpController],
  providers: [OrdersService, OrdersController],
})
export class AppModule {}
