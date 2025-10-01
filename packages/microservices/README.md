# @nl-framework/microservices

Microservices module for nl-framework providing NestJS-style message patterns, event-driven architecture, and Dapr integration.

## Features

- **Message Patterns**: Decorate controller methods with `@MessagePattern` and `@EventPattern` to handle incoming messages
- **Client API**: Publish events with `emit()` (fire-and-forget) or send requests with `send()` (request/response)
- **Dapr Integration**: Built-in transport for Dapr sidecar with pub/sub support
- **Pluggable Transports**: Abstract transport interface allows custom implementations
- **Logger Integration**: Uses `@nl-framework/logger` for structured logging

## Installation

```bash
bun add @nl-framework/microservices
```

## Quick Start

### 1. Configure Dapr Settings

Add to your `config/default.yaml`:

```yaml
microservices:
  dapr:
    httpPort: 3500
    grpcPort: 50001
    componentsPath: ./dapr/components
  pubsub:
    name: redis-pubsub
```

### 2. Create a Message Handler Controller

```typescript
import { Controller, Injectable } from '@nl-framework/core';
import { MessagePatternDecorator, EventPattern } from '@nl-framework/microservices';

@Controller()
@Injectable()
export class OrdersController {
  @MessagePatternDecorator('order.created')
  handleOrderCreated(context: MessageContext) {
    console.log('Order created:', context.data);
    return { status: 'processed' };
  }

  @EventPattern({ cmd: 'notify' })
  handleNotification(context: MessageContext) {
    console.log('Notification:', context.data);
  }
}
```

### 3. Register the Module

```typescript
import { Module } from '@nl-framework/core';
import { createMicroservicesModule } from '@nl-framework/microservices';
import { OrdersController } from './orders.controller';

@Module({
  imports: [
    createMicroservicesModule({
      controllers: [OrdersController],
    }),
  ],
  controllers: [OrdersController],
})
export class AppModule {}
```

### 4. Publish Events

```typescript
import { MicroserviceClient } from '@nl-framework/microservices';

@Injectable()
export class OrdersService {
  constructor(private readonly client: MicroserviceClient) {}

  async createOrder(data: unknown) {
    // Fire-and-forget event
    await this.client.emit('order.created', { orderId: 123, ...data });

    // Request/response (coming soon)
    // const result = await this.client.send('process.order', data);
  }
}
```

## API Reference

### Decorators

#### `@MessagePatternDecorator(pattern)`

Marks a method as a message handler for request/response patterns.

```typescript
@MessagePatternDecorator('user.get')
async getUser(context: MessageContext) {
  return { id: 1, name: 'John' };
}
```

#### `@EventPattern(pattern)`

Marks a method as an event handler (fire-and-forget).

```typescript
@EventPattern('user.created')
handleUserCreated(context: MessageContext) {
  console.log('New user:', context.data);
}
```

### Client Methods

#### `emit(pattern, data)`

Publishes a fire-and-forget event.

```typescript
await client.emit('order.created', { orderId: 123 });
```

#### `send(pattern, data)`

Sends a request and awaits a response (coming soon).

```typescript
const result = await client.send('process.payment', { amount: 100 });
```

## Dapr Setup

### 1. Create Component Definition

Create `dapr/components/redis-pubsub.yaml`:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: redis-pubsub
spec:
  type: pubsub.redis
  version: v1
  metadata:
    - name: redisHost
      value: localhost:6379
```

### 2. Run with Dapr Sidecar

```bash
dapr run --app-id my-service --app-port 3000 --dapr-http-port 3500 -- bun run start
```

## Transport Options

### DaprTransport

```typescript
import { DaprTransport } from '@nl-framework/microservices';

const transport = new DaprTransport({
  daprHost: 'localhost',
  daprHttpPort: 3500,
  pubsubName: 'redis-pubsub',
  logger: myLogger,
});
```

### Custom Transport

Implement the `Transport` interface:

```typescript
import type { Transport, MessagePattern } from '@nl-framework/microservices';

export class CustomTransport implements Transport {
  async connect(): Promise<void> {
    // Initialize connection
  }

  async close(): Promise<void> {
    // Cleanup
  }

  async emit(pattern: MessagePattern, data: unknown): Promise<void> {
    // Publish event
  }

  async send<TResult>(pattern: MessagePattern, data: unknown): Promise<TResult> {
    // Send request, await response
  }
}
```

## Roadmap

- [ ] Request/response pattern via Dapr service invocation
- [ ] Subscription endpoint handlers for Dapr pub/sub
- [ ] Message serialization/deserialization strategies
- [ ] Retry policies and dead-letter queues
- [ ] Integration with `@nl-framework/http` for hybrid services
- [ ] Additional transport implementations (NATS, RabbitMQ, etc.)

## License

MIT
