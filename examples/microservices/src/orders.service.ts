import { Injectable } from '@nl-framework/core';
import { Logger } from '@nl-framework/logger';
import { MicroserviceClient } from '@nl-framework/microservices';

@Injectable()
export class OrdersService {
  constructor(
    private readonly client: MicroserviceClient,
    private readonly logger: Logger,
  ) {}

  async processOrder(orderId: string): Promise<void> {
    this.logger.info('Processing order', { orderId });

    // Simulate processing
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Emit status update event
    await this.client.emit('order.status.updated', {
      orderId,
      status: 'processing',
    });

    this.logger.info('Order processing started', { orderId });

    // Simulate completion
    await new Promise(resolve => setTimeout(resolve, 2000));

    await this.client.emit('order.status.updated', {
      orderId,
      status: 'completed',
    });

    this.logger.info('Order completed', { orderId });
  }

  async publishNewOrder(customerId: string, items: Array<{ productId: string; quantity: number }>): Promise<void> {
    const total = items.reduce((sum, item) => sum + item.quantity * 10, 0); // Mock pricing

    await this.client.emit('order.created', {
      customerId,
      items,
      total,
    });

    this.logger.info('New order published', { customerId, total });
  }
}
