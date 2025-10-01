import { Controller, Injectable } from '@nl-framework/core';
import { Get, Post } from '@nl-framework/http';
import type { RequestContext } from '@nl-framework/http';
import { OrdersService } from './orders.service';

@Controller('/orders')
@Injectable()
export class OrdersHttpController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post('/create')
  async createOrder(context: RequestContext) {
    const body = context.body as {
      customerId: string;
      items: Array<{ productId: string; quantity: number }>;
    };

    await this.ordersService.publishNewOrder(body.customerId, body.items);

    return {
      success: true,
      message: 'Order creation event published',
    };
  }

  @Get('/health')
  health() {
    return { status: 'ok', service: 'orders-microservice' };
  }
}
