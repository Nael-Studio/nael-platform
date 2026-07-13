import { Injectable } from '@nl-framework/core';
import { Logger } from '@nl-framework/logger';
import { MessagePattern, EventPattern } from '@nl-framework/microservices';

export interface Order {
  id: string;
  customerId: string;
  items: Array<{ productId: string; quantity: number }>;
  total: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: string;
}

interface NewOrderEvent {
  customerId: string;
  items: Array<{ productId: string; quantity: number }>;
  total: number;
}

interface StatusUpdateEvent {
  orderId: string;
  status: Order['status'];
}

@Injectable()
export class OrdersController {
  private readonly orders = new Map<string, Order>();

  constructor(private readonly logger: Logger) {}

  /**
   * Pub/sub event — auto-subscribed via `GET /dapr/subscribe`. The deserialized
   * payload is passed straight in; guards, interceptors, pipes and filters run
   * around this method just like an HTTP handler.
   */
  @EventPattern('order.created')
  async onOrderCreated(payload: NewOrderEvent) {
    const order: Order = {
      ...payload,
      id: `order-${this.orders.size + 1}`,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    this.orders.set(order.id, order);
    this.logger.info('Order created', { orderId: order.id, customerId: order.customerId });
  }

  @EventPattern('order.status.updated')
  async onStatusUpdated(payload: StatusUpdateEvent) {
    const order = this.orders.get(payload.orderId);
    if (!order) {
      this.logger.warn('Order not found for status update', { orderId: payload.orderId });
      return;
    }
    order.status = payload.status;
    this.logger.info('Order status updated', { orderId: payload.orderId, status: payload.status });
  }

  /** Request/response — invocable with `client.send('orders.get', ...)`. */
  @MessagePattern('orders.get')
  async getOrder(payload: { orderId: string }) {
    const order = this.orders.get(payload.orderId);
    return order ? { success: true, order } : { success: false, error: 'Order not found' };
  }

  @MessagePattern('orders.list')
  async listOrders() {
    return { success: true, orders: Array.from(this.orders.values()) };
  }
}
