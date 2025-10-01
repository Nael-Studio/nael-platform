import { Injectable } from '@nl-framework/core';
import { Logger } from '@nl-framework/logger';
import type { MessageContext } from '@nl-framework/microservices';
import { MessagePattern, EventPattern } from '@nl-framework/microservices';

export interface Order {
  id: string;
  customerId: string;
  items: Array<{ productId: string; quantity: number }>;
  total: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: Date;
}

@Injectable()
export class OrdersController {
  private orders = new Map<string, Order>();

  constructor(private readonly logger: Logger) {}

  @MessagePattern('order.create')
  async createOrder(context: MessageContext) {
    const data = context.data as Omit<Order, 'id' | 'status' | 'createdAt'>;
    
    const order: Order = {
      ...data,
      id: `order-${Date.now()}`,
      status: 'pending',
      createdAt: new Date(),
    };

    this.orders.set(order.id, order);
    
    this.logger.info('Order created', { orderId: order.id, customerId: order.customerId });

    return {
      success: true,
      order,
    };
  }

  @EventPattern('order.status.updated')
  async handleStatusUpdate(context: MessageContext) {
    const { orderId, status } = context.data as { orderId: string; status: Order['status'] };
    
    const order = this.orders.get(orderId);
    if (!order) {
      this.logger.warn('Order not found for status update', { orderId });
      return;
    }

    order.status = status;
    this.logger.info('Order status updated', { orderId, status });
  }

  @MessagePattern('order.get')
  async getOrder(context: MessageContext) {
    const { orderId } = context.data as { orderId: string };
    
    const order = this.orders.get(orderId);
    if (!order) {
      return {
        success: false,
        error: 'Order not found',
      };
    }

    return {
      success: true,
      order,
    };
  }

  @MessagePattern('orders.list')
  async listOrders() {
    return {
      success: true,
      orders: Array.from(this.orders.values()),
    };
  }
}
