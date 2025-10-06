import type { PackageDocumentation } from '../../types';

export const microservicesDocumentation: PackageDocumentation = {
  name: '@nl-framework/microservices',
  version: '0.1.0',
  description:
    'Dapr-native microservice utilities including message pattern decorators, workflow orchestration, and state management wrappers.',
  installation: 'bun add @nl-framework/microservices dapr-client',
  features: [
    {
      title: 'Message Patterns',
      description: 'Handle pub/sub and bindings using declarative decorators such as `@MessagePattern`.',
      icon: '📡',
    },
    {
      title: 'Workflow Support',
      description: 'Trigger and orchestrate Dapr workflows with strongly-typed activities.',
      icon: '⚙️',
    },
    {
      title: 'State Store Abstraction',
      description: 'Interact with Dapr state stores via repository-style helpers.',
      icon: '💾',
    },
  ],
  quickStart: {
    description: 'Subscribe to pub/sub topics and reply with data using the message pattern decorators.',
    steps: [
      'Annotate a provider with `@MessagePattern` to subscribe to a Dapr topic.',
      'Inject services via the core DI container to process messages.',
      'Bootstrap the microservice adapter with the platform package.',
    ],
    code: `import { MessagePattern } from '@nl-framework/microservices';
import { Module } from '@nl-framework/core';
import { bootstrapMicroserviceApplication } from '@nl-framework/platform';

class OrdersService {
  @MessagePattern('order.created')
  async handleCreated(payload: { orderId: string }) {
    console.log('Order created', payload.orderId);
  }
}

@Module({ providers: [OrdersService] })
class OrdersModule {}

await bootstrapMicroserviceApplication(OrdersModule, {
  appId: 'orders-service',
});
`,
  },
  api: {
    decorators: [
      {
        name: '@MessagePattern',
        signature: '@MessagePattern(topic: string, options?: MessageOptions): MethodDecorator',
        description: 'Subscribe to a Dapr pub/sub topic and process inbound messages.',
      },
    ],
    classes: [
      {
        name: 'DaprClientFactory',
        description: 'Factory that provisions Dapr gRPC/HTTP clients configured via dependency injection.',
        methods: [
          {
            name: 'createClient',
            signature: 'createClient(): DaprClient',
            description: 'Create a Dapr client bound to configured hostname/ports.',
          },
        ],
      },
    ],
  },
  examples: [
    {
      title: 'Workflow Trigger',
      description: 'Kick off a Dapr workflow when a message arrives.',
      code: `@MessagePattern('invoice.generate')
async handleInvoice(data: { invoiceId: string }) {
  const workflow = await this.workflowClient.start('invoice-processor', data.invoiceId, data);
  return workflow.result();
}
`,
    },
  ],
  bestPractices: [
    {
      category: 'Resilience',
      do: [
        {
          title: 'Use retries',
          description: 'Configure pub/sub components with retry policies and idempotency checks inside handlers.',
        },
      ],
      dont: [
        {
          title: 'Avoid blocking calls',
          description: 'Return promptly from message handlers and offload heavy work to background services.',
        },
      ],
    },
  ],
  troubleshooting: [
    {
      issue: 'Messages dropped',
      symptoms: ['Handlers not triggered', 'No logs'],
      solution:
        'Verify Dapr subscription components are registered and that the appId matches the component scope.',
    },
  ],
  relatedPackages: ['@nl-framework/platform', '@nl-framework/logger', '@nl-framework/config'],
};
