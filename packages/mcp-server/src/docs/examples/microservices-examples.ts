import type { ExampleCatalogEntry } from '../../types';

export const microservicesExamples: ExampleCatalogEntry[] = [
  {
    id: 'microservices-pubsub',
    category: 'microservices',
    title: 'Pub/Sub Message Handler',
    description: 'Subscribe to a Dapr topic to process domain events.',
    code: `import { MessagePattern } from '@nl-framework/microservices';

export class BillingHandler {
  @MessagePattern('order.completed')
  async onOrderCompleted(event: { orderId: string; amount: number }) {
    await this.invoicingService.generate(event.orderId, event.amount);
  }
}
`,
    relatedPackages: ['@nl-framework/microservices'],
    tags: ['dapr', 'pubsub'],
  },
];
