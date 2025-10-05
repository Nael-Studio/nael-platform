import { PackageDocumentation } from '../../types.js';

export const microservicesPackageDocs: PackageDocumentation = {
  name: '@nl-framework/microservices',
  description: 'Complete microservices solution with Dapr integration, event-driven architecture, pub/sub, service invocation, and distributed tracing',
  version: '1.0.0',
  installation: 'bun add @nl-framework/microservices @dapr/dapr',
  
  features: [
    {
      title: 'Service-to-Service Invocation',
      description: 'Direct service communication with automatic service discovery',
      icon: '🔄'
    },
    {
      title: 'Pub/Sub Messaging',
      description: 'Event-driven architecture with multiple message brokers',
      icon: '📨'
    },
    {
      title: 'State Management',
      description: 'Distributed state store with consistency guarantees',
      icon: '💾'
    },
    {
      title: 'Distributed Tracing',
      description: 'Built-in tracing with OpenTelemetry integration',
      icon: '🔍'
    },
    {
      title: 'Bindings',
      description: 'Connect to external systems (queues, databases, APIs)',
      icon: '🔗'
    },
    {
      title: 'Secrets Management',
      description: 'Secure secret retrieval from various providers',
      icon: '🔐'
    }
  ],
  
  quickStart: {
    description: 'Set up microservices with Dapr',
    steps: [
      'Install Dapr CLI and initialize: dapr init',
      'Install dependencies: bun add @nl-framework/microservices @dapr/dapr',
      'Register MicroservicesModule in your app',
      'Define event handlers with @EventPattern',
      'Invoke other services with DaprClient',
      'Run with Dapr: dapr run --app-id myservice --app-port 3000 bun run start'
    ],
    code: `// app.module.ts
import { Module } from '@nl-framework/core';
import { MicroservicesModule } from '@nl-framework/microservices';

@Module({
  imports: [
    MicroservicesModule.forRoot({
      appId: 'order-service',
      appPort: 3000,
      daprPort: 3500,
      pubsub: {
        name: 'pubsub',
        type: 'redis'
      }
    })
  ]
})
export class AppModule {}

// order.controller.ts
import { Controller } from '@nl-framework/core';
import { EventPattern, Ctx, Payload, DaprClient } from '@nl-framework/microservices';

@Controller()
export class OrderController {
  constructor(private daprClient: DaprClient) {}

  @EventPattern('order.created')
  async handleOrderCreated(
    @Payload() data: any,
    @Ctx() context: any
  ) {
    console.log('Order created:', data);
    
    // Invoke another service
    const result = await this.daprClient.invokeMethod(
      'inventory-service',
      'reserve-stock',
      'POST',
      data.items
    );
    
    return result;
  }
}

// main.ts
import { NaelFactory } from '@nl-framework/platform';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NaelFactory.createMicroservice(AppModule);
  await app.listen();
}

bootstrap();

// Run with Dapr:
// dapr run --app-id order-service --app-port 3000 bun run start`
  },
  
  api: {
    decorators: [
      {
        name: '@EventPattern',
        signature: '@EventPattern(pattern: string)',
        description: 'Subscribe to pub/sub events or message patterns',
        package: '@nl-framework/microservices',
        parameters: [
          {
            name: 'pattern',
            type: 'string',
            description: 'Event pattern or topic name to subscribe to',
            required: true
          }
        ],
        examples: [
          `@EventPattern('order.created')
async handleOrderCreated(@Payload() data: any) {
  console.log('New order:', data);
}`,
          `@EventPattern('user.registered')
async handleUserRegistered(
  @Payload() user: User,
  @Ctx() context: any
) {
  await this.emailService.sendWelcome(user.email);
}`
        ]
      },
      {
        name: '@MessagePattern',
        signature: '@MessagePattern(pattern: string)',
        description: 'Handle request-response message patterns',
        package: '@nl-framework/microservices',
        parameters: [
          {
            name: 'pattern',
            type: 'string',
            description: 'Message pattern to handle',
            required: true
          }
        ],
        examples: [
          `@MessagePattern('get.user')
async getUser(@Payload() userId: string) {
  return this.userService.findById(userId);
}`,
          `@MessagePattern('calculate.total')
async calculateTotal(@Payload() items: any[]) {
  return items.reduce((sum, item) => sum + item.price, 0);
}`
        ]
      },
      {
        name: '@Payload',
        signature: '@Payload()',
        description: 'Extracts the message payload/data',
        package: '@nl-framework/microservices',
        parameters: [],
        examples: [
          `@EventPattern('order.created')
async handleOrder(@Payload() orderData: CreateOrderDto) {
  return this.processOrder(orderData);
}`
        ]
      },
      {
        name: '@Ctx',
        signature: '@Ctx()',
        description: 'Extracts the message context/metadata',
        package: '@nl-framework/microservices',
        parameters: [],
        examples: [
          `@EventPattern('order.created')
async handleOrder(
  @Payload() data: any,
  @Ctx() context: { topic: string; pubsubName: string }
) {
  console.log('Received from:', context.topic);
}`
        ]
      }
    ],
    
    classes: [
      {
        name: 'MicroservicesModule',
        description: 'Module for configuring microservices with Dapr',
        package: '@nl-framework/microservices',
        constructor: {},
        methods: [
          {
            name: 'forRoot',
            signature: 'static forRoot(options: MicroservicesOptions): DynamicModule',
            description: 'Register MicroservicesModule with Dapr configuration',
            parameters: [
              {
                name: 'options',
                type: 'MicroservicesOptions',
                description: 'Microservices and Dapr configuration'
              }
            ],
            returns: 'DynamicModule'
          }
        ],
        examples: [
          `MicroservicesModule.forRoot({
  appId: 'my-service',
  appPort: 3000,
  daprPort: 3500
})`,
          `MicroservicesModule.forRoot({
  appId: 'order-service',
  appPort: 3000,
  daprPort: 3500,
  pubsub: {
    name: 'pubsub',
    type: 'redis'
  },
  stateStore: {
    name: 'statestore',
    type: 'redis'
  }
})`
        ]
      },
      {
        name: 'DaprClient',
        description: 'Client for interacting with Dapr sidecar',
        package: '@nl-framework/microservices',
        constructor: {},
        methods: [
          {
            name: 'invokeMethod',
            signature: 'invokeMethod(appId: string, methodName: string, httpMethod: string, data?: any): Promise<any>',
            description: 'Invoke a method on another service',
            parameters: [
              {
                name: 'appId',
                type: 'string',
                description: 'Target service app ID'
              },
              {
                name: 'methodName',
                type: 'string',
                description: 'Method/endpoint name'
              },
              {
                name: 'httpMethod',
                type: 'string',
                description: 'HTTP method (GET, POST, etc.)'
              },
              {
                name: 'data',
                type: 'any',
                description: 'Request data'
              }
            ],
            returns: 'Promise<any>'
          },
          {
            name: 'publishEvent',
            signature: 'publishEvent(pubsubName: string, topic: string, data: any): Promise<void>',
            description: 'Publish an event to a topic',
            parameters: [
              {
                name: 'pubsubName',
                type: 'string',
                description: 'Pub/sub component name'
              },
              {
                name: 'topic',
                type: 'string',
                description: 'Topic name'
              },
              {
                name: 'data',
                type: 'any',
                description: 'Event data'
              }
            ],
            returns: 'Promise<void>'
          },
          {
            name: 'getState',
            signature: 'getState(storeName: string, key: string): Promise<any>',
            description: 'Get state from state store',
            parameters: [
              {
                name: 'storeName',
                type: 'string',
                description: 'State store component name'
              },
              {
                name: 'key',
                type: 'string',
                description: 'State key'
              }
            ],
            returns: 'Promise<any>'
          },
          {
            name: 'saveState',
            signature: 'saveState(storeName: string, key: string, value: any): Promise<void>',
            description: 'Save state to state store',
            parameters: [
              {
                name: 'storeName',
                type: 'string',
                description: 'State store component name'
              },
              {
                name: 'key',
                type: 'string',
                description: 'State key'
              },
              {
                name: 'value',
                type: 'any',
                description: 'State value'
              }
            ],
            returns: 'Promise<void>'
          },
          {
            name: 'deleteState',
            signature: 'deleteState(storeName: string, key: string): Promise<void>',
            description: 'Delete state from state store',
            parameters: [
              {
                name: 'storeName',
                type: 'string',
                description: 'State store component name'
              },
              {
                name: 'key',
                type: 'string',
                description: 'State key'
              }
            ],
            returns: 'Promise<void>'
          },
          {
            name: 'getSecret',
            signature: 'getSecret(storeName: string, key: string): Promise<any>',
            description: 'Get secret from secret store',
            parameters: [
              {
                name: 'storeName',
                type: 'string',
                description: 'Secret store component name'
              },
              {
                name: 'key',
                type: 'string',
                description: 'Secret key'
              }
            ],
            returns: 'Promise<any>'
          }
        ],
        examples: [
          `// Invoke another service
const result = await this.daprClient.invokeMethod(
  'user-service',
  'users/123',
  'GET'
);`,
          `// Publish event
await this.daprClient.publishEvent(
  'pubsub',
  'order.created',
  { orderId: '123', total: 100 }
);`,
          `// Get state
const cart = await this.daprClient.getState(
  'statestore',
  'user:123:cart'
);`,
          `// Save state
await this.daprClient.saveState(
  'statestore',
  'user:123:cart',
  { items: [...] }
);`
        ]
      }
    ],
    
    interfaces: [
      {
        name: 'MicroservicesOptions',
        description: 'Configuration options for MicroservicesModule',
        package: '@nl-framework/microservices',
        properties: [
          {
            name: 'appId',
            type: 'string',
            description: 'Unique application identifier',
            required: true
          },
          {
            name: 'appPort',
            type: 'number',
            description: 'Application HTTP port',
            required: true
          },
          {
            name: 'daprPort',
            type: 'number',
            description: 'Dapr sidecar HTTP port (default: 3500)',
            required: false
          },
          {
            name: 'daprGrpcPort',
            type: 'number',
            description: 'Dapr sidecar gRPC port (default: 50001)',
            required: false
          },
          {
            name: 'pubsub',
            type: 'PubSubConfig',
            description: 'Pub/sub configuration',
            required: false
          },
          {
            name: 'stateStore',
            type: 'StateStoreConfig',
            description: 'State store configuration',
            required: false
          }
        ],
        examples: [
          `{
  appId: 'order-service',
  appPort: 3000,
  daprPort: 3500
}`,
          `{
  appId: 'order-service',
  appPort: 3000,
  daprPort: 3500,
  pubsub: {
    name: 'pubsub',
    type: 'redis'
  },
  stateStore: {
    name: 'statestore',
    type: 'redis'
  }
}`
        ]
      },
      {
        name: 'PubSubConfig',
        description: 'Pub/sub component configuration',
        package: '@nl-framework/microservices',
        properties: [
          {
            name: 'name',
            type: 'string',
            description: 'Component name',
            required: true
          },
          {
            name: 'type',
            type: 'string',
            description: 'Pub/sub type (redis, kafka, rabbitmq, etc.)',
            required: true
          }
        ],
        examples: [
          `{
  name: 'pubsub',
  type: 'redis'
}`,
          `{
  name: 'kafka-pubsub',
  type: 'kafka'
}`
        ]
      },
      {
        name: 'StateStoreConfig',
        description: 'State store component configuration',
        package: '@nl-framework/microservices',
        properties: [
          {
            name: 'name',
            type: 'string',
            description: 'Component name',
            required: true
          },
          {
            name: 'type',
            type: 'string',
            description: 'State store type (redis, mongodb, postgresql, etc.)',
            required: true
          }
        ],
        examples: [
          `{
  name: 'statestore',
  type: 'redis'
}`,
          `{
  name: 'mongo-state',
  type: 'mongodb'
}`
        ]
      }
    ]
  },
  
  examples: [
    {
      title: 'Event-Driven Microservices Architecture',
      description: 'Build event-driven services with pub/sub messaging',
      code: `// order-service/app.module.ts
import { Module } from '@nl-framework/core';
import { MicroservicesModule } from '@nl-framework/microservices';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';

@Module({
  imports: [
    MicroservicesModule.forRoot({
      appId: 'order-service',
      appPort: 3001,
      pubsub: {
        name: 'pubsub',
        type: 'redis'
      }
    })
  ],
  controllers: [OrderController],
  providers: [OrderService]
})
export class AppModule {}

// order-service/order.controller.ts
import { Controller, Post, Body } from '@nl-framework/core';
import { DaprClient } from '@nl-framework/microservices';
import { OrderService } from './order.service';

@Controller('orders')
export class OrderController {
  constructor(
    private orderService: OrderService,
    private daprClient: DaprClient
  ) {}

  @Post()
  async createOrder(@Body() createOrderDto: any) {
    // Create order
    const order = await this.orderService.create(createOrderDto);

    // Publish event
    await this.daprClient.publishEvent(
      'pubsub',
      'order.created',
      {
        orderId: order.id,
        userId: order.userId,
        total: order.total,
        items: order.items
      }
    );

    return order;
  }
}

// order-service/order.service.ts
import { Injectable } from '@nl-framework/core';

@Injectable()
export class OrderService {
  private orders = new Map();

  async create(data: any) {
    const order = {
      id: \`order-\${Date.now()}\`,
      ...data,
      status: 'pending',
      createdAt: new Date()
    };

    this.orders.set(order.id, order);
    return order;
  }

  async findById(id: string) {
    return this.orders.get(id);
  }

  async updateStatus(id: string, status: string) {
    const order = this.orders.get(id);
    if (order) {
      order.status = status;
      this.orders.set(id, order);
    }
    return order;
  }
}

// inventory-service/app.module.ts
import { Module } from '@nl-framework/core';
import { MicroservicesModule } from '@nl-framework/microservices';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';

@Module({
  imports: [
    MicroservicesModule.forRoot({
      appId: 'inventory-service',
      appPort: 3002,
      pubsub: {
        name: 'pubsub',
        type: 'redis'
      }
    })
  ],
  controllers: [InventoryController],
  providers: [InventoryService]
})
export class AppModule {}

// inventory-service/inventory.controller.ts
import { Controller } from '@nl-framework/core';
import { EventPattern, Payload, DaprClient } from '@nl-framework/microservices';
import { InventoryService } from './inventory.service';

@Controller()
export class InventoryController {
  constructor(
    private inventoryService: InventoryService,
    private daprClient: DaprClient
  ) {}

  @EventPattern('order.created')
  async handleOrderCreated(@Payload() orderData: any) {
    console.log('Processing order:', orderData.orderId);

    try {
      // Reserve inventory
      await this.inventoryService.reserveItems(orderData.items);

      // Publish success event
      await this.daprClient.publishEvent(
        'pubsub',
        'inventory.reserved',
        {
          orderId: orderData.orderId,
          items: orderData.items
        }
      );

      console.log('Inventory reserved for order:', orderData.orderId);
    } catch (error) {
      // Publish failure event
      await this.daprClient.publishEvent(
        'pubsub',
        'inventory.failed',
        {
          orderId: orderData.orderId,
          reason: error.message
        }
      );

      console.error('Failed to reserve inventory:', error);
    }
  }
}

// notification-service/app.module.ts
import { Module } from '@nl-framework/core';
import { MicroservicesModule } from '@nl-framework/microservices';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';

@Module({
  imports: [
    MicroservicesModule.forRoot({
      appId: 'notification-service',
      appPort: 3003,
      pubsub: {
        name: 'pubsub',
        type: 'redis'
      }
    })
  ],
  controllers: [NotificationController],
  providers: [NotificationService]
})
export class AppModule {}

// notification-service/notification.controller.ts
import { Controller } from '@nl-framework/core';
import { EventPattern, Payload } from '@nl-framework/microservices';
import { NotificationService } from './notification.service';

@Controller()
export class NotificationController {
  constructor(private notificationService: NotificationService) {}

  @EventPattern('order.created')
  async handleOrderCreated(@Payload() data: any) {
    await this.notificationService.sendEmail(
      data.userId,
      'Order Confirmation',
      \`Your order \${data.orderId} has been created!\`
    );
  }

  @EventPattern('inventory.reserved')
  async handleInventoryReserved(@Payload() data: any) {
    console.log('Inventory reserved, sending notification...');
  }

  @EventPattern('inventory.failed')
  async handleInventoryFailed(@Payload() data: any) {
    await this.notificationService.sendEmail(
      data.orderId,
      'Order Failed',
      \`Sorry, we couldn't process your order: \${data.reason}\`
    );
  }
}

// Run services:
// dapr run --app-id order-service --app-port 3001 --dapr-http-port 3501 bun run start
// dapr run --app-id inventory-service --app-port 3002 --dapr-http-port 3502 bun run start
// dapr run --app-id notification-service --app-port 3003 --dapr-http-port 3503 bun run start`,
      tags: ['microservices', 'dapr', 'pubsub', 'events'],
      explanation: 'Complete event-driven microservices architecture with multiple services'
    },
    {
      title: 'Service-to-Service Invocation',
      description: 'Direct service communication with service discovery',
      code: `// api-gateway/app.module.ts
import { Module } from '@nl-framework/core';
import { MicroservicesModule } from '@nl-framework/microservices';
import { GatewayController } from './gateway.controller';

@Module({
  imports: [
    MicroservicesModule.forRoot({
      appId: 'api-gateway',
      appPort: 3000
    })
  ],
  controllers: [GatewayController]
})
export class AppModule {}

// api-gateway/gateway.controller.ts
import { Controller, Get, Post, Param, Body } from '@nl-framework/core';
import { DaprClient } from '@nl-framework/microservices';

@Controller('api')
export class GatewayController {
  constructor(private daprClient: DaprClient) {}

  // User operations
  @Get('users/:id')
  async getUser(@Param('id') id: string) {
    return this.daprClient.invokeMethod(
      'user-service',
      \`users/\${id}\`,
      'GET'
    );
  }

  @Post('users')
  async createUser(@Body() userData: any) {
    return this.daprClient.invokeMethod(
      'user-service',
      'users',
      'POST',
      userData
    );
  }

  // Order operations
  @Get('orders/:id')
  async getOrder(@Param('id') id: string) {
    return this.daprClient.invokeMethod(
      'order-service',
      \`orders/\${id}\`,
      'GET'
    );
  }

  @Post('orders')
  async createOrder(@Body() orderData: any) {
    // Validate user exists
    const user = await this.daprClient.invokeMethod(
      'user-service',
      \`users/\${orderData.userId}\`,
      'GET'
    );

    if (!user) {
      throw new Error('User not found');
    }

    // Check inventory
    const inventory = await this.daprClient.invokeMethod(
      'inventory-service',
      'check-availability',
      'POST',
      { items: orderData.items }
    );

    if (!inventory.available) {
      throw new Error('Items not available');
    }

    // Create order
    const order = await this.daprClient.invokeMethod(
      'order-service',
      'orders',
      'POST',
      orderData
    );

    return order;
  }

  // Product operations
  @Get('products')
  async getProducts() {
    return this.daprClient.invokeMethod(
      'product-service',
      'products',
      'GET'
    );
  }

  @Get('products/:id')
  async getProduct(@Param('id') id: string) {
    const product = await this.daprClient.invokeMethod(
      'product-service',
      \`products/\${id}\`,
      'GET'
    );

    // Get inventory count
    const inventory = await this.daprClient.invokeMethod(
      'inventory-service',
      \`inventory/\${id}\`,
      'GET'
    );

    return {
      ...product,
      stock: inventory.quantity
    };
  }
}

// user-service/user.controller.ts
import { Controller, Get, Post, Param, Body } from '@nl-framework/core';
import { UserService } from './user.service';

@Controller('users')
export class UserController {
  constructor(private userService: UserService) {}

  @Get(':id')
  async getUser(@Param('id') id: string) {
    return this.userService.findById(id);
  }

  @Post()
  async createUser(@Body() userData: any) {
    return this.userService.create(userData);
  }

  @Get(':id/orders')
  async getUserOrders(
    @Param('id') userId: string,
    @Inject(DaprClient) daprClient: DaprClient
  ) {
    // Call order service
    return daprClient.invokeMethod(
      'order-service',
      \`orders/user/\${userId}\`,
      'GET'
    );
  }
}

// inventory-service/inventory.controller.ts
import { Controller, Post, Get, Param, Body } from '@nl-framework/core';
import { InventoryService } from './inventory.service';

@Controller()
export class InventoryController {
  constructor(private inventoryService: InventoryService) {}

  @Post('check-availability')
  async checkAvailability(@Body() data: { items: any[] }) {
    const available = await this.inventoryService.checkStock(data.items);
    return { available };
  }

  @Get('inventory/:productId')
  async getInventory(@Param('productId') productId: string) {
    return this.inventoryService.getStock(productId);
  }

  @Post('reserve')
  async reserve(@Body() data: { items: any[] }) {
    return this.inventoryService.reserveItems(data.items);
  }
}`,
      tags: ['microservices', 'dapr', 'service-invocation', 'gateway'],
      explanation: 'API Gateway pattern with service-to-service communication'
    },
    {
      title: 'Distributed State Management',
      description: 'Use Dapr state store for distributed state',
      code: `// shopping-cart/app.module.ts
import { Module } from '@nl-framework/core';
import { MicroservicesModule } from '@nl-framework/microservices';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';

@Module({
  imports: [
    MicroservicesModule.forRoot({
      appId: 'cart-service',
      appPort: 3004,
      stateStore: {
        name: 'statestore',
        type: 'redis'
      }
    })
  ],
  controllers: [CartController],
  providers: [CartService]
})
export class AppModule {}

// shopping-cart/cart.service.ts
import { Injectable } from '@nl-framework/core';
import { DaprClient } from '@nl-framework/microservices';

interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

interface Cart {
  userId: string;
  items: CartItem[];
  total: number;
  updatedAt: Date;
}

@Injectable()
export class CartService {
  private readonly STORE_NAME = 'statestore';

  constructor(private daprClient: DaprClient) {}

  private getCartKey(userId: string): string {
    return \`cart:\${userId}\`;
  }

  async getCart(userId: string): Promise<Cart> {
    const key = this.getCartKey(userId);
    const cart = await this.daprClient.getState(this.STORE_NAME, key);

    return cart || {
      userId,
      items: [],
      total: 0,
      updatedAt: new Date()
    };
  }

  async addItem(userId: string, item: CartItem): Promise<Cart> {
    const cart = await this.getCart(userId);

    // Check if item exists
    const existingItem = cart.items.find(
      i => i.productId === item.productId
    );

    if (existingItem) {
      existingItem.quantity += item.quantity;
    } else {
      cart.items.push(item);
    }

    // Recalculate total
    cart.total = cart.items.reduce(
      (sum, item) => sum + (item.price * item.quantity),
      0
    );
    cart.updatedAt = new Date();

    // Save to state store
    await this.daprClient.saveState(
      this.STORE_NAME,
      this.getCartKey(userId),
      cart
    );

    return cart;
  }

  async removeItem(userId: string, productId: string): Promise<Cart> {
    const cart = await this.getCart(userId);

    cart.items = cart.items.filter(item => item.productId !== productId);
    cart.total = cart.items.reduce(
      (sum, item) => sum + (item.price * item.quantity),
      0
    );
    cart.updatedAt = new Date();

    await this.daprClient.saveState(
      this.STORE_NAME,
      this.getCartKey(userId),
      cart
    );

    return cart;
  }

  async updateQuantity(
    userId: string,
    productId: string,
    quantity: number
  ): Promise<Cart> {
    const cart = await this.getCart(userId);
    const item = cart.items.find(i => i.productId === productId);

    if (!item) {
      throw new Error('Item not found in cart');
    }

    if (quantity <= 0) {
      return this.removeItem(userId, productId);
    }

    item.quantity = quantity;
    cart.total = cart.items.reduce(
      (sum, item) => sum + (item.price * item.quantity),
      0
    );
    cart.updatedAt = new Date();

    await this.daprClient.saveState(
      this.STORE_NAME,
      this.getCartKey(userId),
      cart
    );

    return cart;
  }

  async clearCart(userId: string): Promise<void> {
    await this.daprClient.deleteState(
      this.STORE_NAME,
      this.getCartKey(userId)
    );
  }

  async checkout(userId: string): Promise<any> {
    const cart = await this.getCart(userId);

    if (cart.items.length === 0) {
      throw new Error('Cart is empty');
    }

    // Create order (in real app, call order service)
    const order = {
      orderId: \`order-\${Date.now()}\`,
      userId,
      items: cart.items,
      total: cart.total,
      createdAt: new Date()
    };

    // Clear cart after checkout
    await this.clearCart(userId);

    return order;
  }
}

// shopping-cart/cart.controller.ts
import { Controller, Get, Post, Delete, Param, Body } from '@nl-framework/core';
import { CartService } from './cart.service';

@Controller('cart')
export class CartController {
  constructor(private cartService: CartService) {}

  @Get(':userId')
  async getCart(@Param('userId') userId: string) {
    return this.cartService.getCart(userId);
  }

  @Post(':userId/items')
  async addItem(
    @Param('userId') userId: string,
    @Body() item: any
  ) {
    return this.cartService.addItem(userId, item);
  }

  @Delete(':userId/items/:productId')
  async removeItem(
    @Param('userId') userId: string,
    @Param('productId') productId: string
  ) {
    return this.cartService.removeItem(userId, productId);
  }

  @Post(':userId/items/:productId/quantity')
  async updateQuantity(
    @Param('userId') userId: string,
    @Param('productId') productId: string,
    @Body() body: { quantity: number }
  ) {
    return this.cartService.updateQuantity(
      userId,
      productId,
      body.quantity
    );
  }

  @Delete(':userId')
  async clearCart(@Param('userId') userId: string) {
    await this.cartService.clearCart(userId);
    return { message: 'Cart cleared' };
  }

  @Post(':userId/checkout')
  async checkout(@Param('userId') userId: string) {
    return this.cartService.checkout(userId);
  }
}

// Session management example
@Injectable()
export class SessionService {
  private readonly STORE_NAME = 'statestore';

  constructor(private daprClient: DaprClient) {}

  async createSession(userId: string, data: any): Promise<string> {
    const sessionId = \`session-\${Date.now()}-\${Math.random()}\`;
    const session = {
      id: sessionId,
      userId,
      data,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 60 * 1000) // 30 min
    };

    await this.daprClient.saveState(
      this.STORE_NAME,
      \`session:\${sessionId}\`,
      session
    );

    return sessionId;
  }

  async getSession(sessionId: string): Promise<any> {
    return this.daprClient.getState(
      this.STORE_NAME,
      \`session:\${sessionId}\`
    );
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.daprClient.deleteState(
      this.STORE_NAME,
      \`session:\${sessionId}\`
    );
  }
}`,
      tags: ['microservices', 'dapr', 'state', 'distributed'],
      explanation: 'Distributed state management with Dapr state store for shopping cart'
    },
    {
      title: 'Saga Pattern for Distributed Transactions',
      description: 'Implement saga pattern for handling distributed transactions',
      code: `// order-saga/order-saga.service.ts
import { Injectable } from '@nl-framework/core';
import { DaprClient } from '@nl-framework/microservices';

interface SagaStep {
  name: string;
  execute: () => Promise<any>;
  compensate: () => Promise<void>;
}

@Injectable()
export class OrderSagaService {
  constructor(private daprClient: DaprClient) {}

  async executeOrderSaga(orderData: any): Promise<any> {
    const sagaId = \`saga-\${Date.now()}\`;
    const completedSteps: string[] = [];

    const steps: SagaStep[] = [
      {
        name: 'validate-order',
        execute: async () => {
          console.log('Step 1: Validating order...');
          // Validate order data
          if (!orderData.items || orderData.items.length === 0) {
            throw new Error('Order must have items');
          }
          return { valid: true };
        },
        compensate: async () => {
          console.log('Compensate: Validation (nothing to rollback)');
        }
      },
      {
        name: 'reserve-inventory',
        execute: async () => {
          console.log('Step 2: Reserving inventory...');
          const result = await this.daprClient.invokeMethod(
            'inventory-service',
            'reserve',
            'POST',
            { sagaId, items: orderData.items }
          );
          return result;
        },
        compensate: async () => {
          console.log('Compensate: Releasing inventory...');
          await this.daprClient.invokeMethod(
            'inventory-service',
            'release',
            'POST',
            { sagaId }
          );
        }
      },
      {
        name: 'process-payment',
        execute: async () => {
          console.log('Step 3: Processing payment...');
          const result = await this.daprClient.invokeMethod(
            'payment-service',
            'process',
            'POST',
            {
              sagaId,
              amount: orderData.total,
              paymentMethod: orderData.paymentMethod
            }
          );
          return result;
        },
        compensate: async () => {
          console.log('Compensate: Refunding payment...');
          await this.daprClient.invokeMethod(
            'payment-service',
            'refund',
            'POST',
            { sagaId }
          );
        }
      },
      {
        name: 'create-order',
        execute: async () => {
          console.log('Step 4: Creating order...');
          const result = await this.daprClient.invokeMethod(
            'order-service',
            'orders',
            'POST',
            { ...orderData, sagaId }
          );
          return result;
        },
        compensate: async () => {
          console.log('Compensate: Cancelling order...');
          await this.daprClient.invokeMethod(
            'order-service',
            'cancel',
            'POST',
            { sagaId }
          );
        }
      },
      {
        name: 'send-confirmation',
        execute: async () => {
          console.log('Step 5: Sending confirmation...');
          await this.daprClient.publishEvent(
            'pubsub',
            'order.confirmed',
            { sagaId, userId: orderData.userId }
          );
          return { sent: true };
        },
        compensate: async () => {
          console.log('Compensate: Sending cancellation notice...');
          await this.daprClient.publishEvent(
            'pubsub',
            'order.cancelled',
            { sagaId, userId: orderData.userId }
          );
        }
      }
    ];

    try {
      // Execute all steps
      for (const step of steps) {
        console.log(\`Executing: \${step.name}\`);
        await step.execute();
        completedSteps.push(step.name);
      }

      console.log('Saga completed successfully!');
      return { success: true, sagaId };

    } catch (error) {
      console.error(\`Saga failed at step: \${completedSteps.length + 1}\`);
      console.error('Error:', error.message);

      // Compensate in reverse order
      console.log('Starting compensation...');
      for (let i = completedSteps.length - 1; i >= 0; i--) {
        const step = steps[i];
        try {
          console.log(\`Compensating: \${step.name}\`);
          await step.compensate();
        } catch (compensateError) {
          console.error(
            \`Compensation failed for \${step.name}:\`,
            compensateError
          );
          // Log compensation failure but continue
        }
      }

      throw new Error(\`Order saga failed: \${error.message}\`);
    }
  }
}

// order-saga/order-saga.controller.ts
import { Controller, Post, Body } from '@nl-framework/core';
import { OrderSagaService } from './order-saga.service';

@Controller('saga/orders')
export class OrderSagaController {
  constructor(private orderSagaService: OrderSagaService) {}

  @Post()
  async createOrderWithSaga(@Body() orderData: any) {
    try {
      const result = await this.orderSagaService.executeOrderSaga(orderData);
      return {
        success: true,
        message: 'Order created successfully',
        sagaId: result.sagaId
      };
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }
}

// inventory-service/inventory.controller.ts (Saga support)
@Controller()
export class InventoryController {
  private reservations = new Map();

  @Post('reserve')
  async reserve(@Body() data: { sagaId: string; items: any[] }) {
    console.log(\`Reserving inventory for saga: \${data.sagaId}\`);
    
    // Check availability
    for (const item of data.items) {
      const available = await this.checkAvailability(item.productId);
      if (available < item.quantity) {
        throw new Error(\`Insufficient stock for \${item.productId}\`);
      }
    }

    // Reserve
    this.reservations.set(data.sagaId, data.items);
    
    return { reserved: true, sagaId: data.sagaId };
  }

  @Post('release')
  async release(@Body() data: { sagaId: string }) {
    console.log(\`Releasing inventory for saga: \${data.sagaId}\`);
    this.reservations.delete(data.sagaId);
    return { released: true };
  }
}

// payment-service/payment.controller.ts (Saga support)
@Controller()
export class PaymentController {
  private payments = new Map();

  @Post('process')
  async process(@Body() data: any) {
    console.log(\`Processing payment for saga: \${data.sagaId}\`);
    
    // Simulate payment processing
    const transactionId = \`txn-\${Date.now()}\`;
    this.payments.set(data.sagaId, {
      transactionId,
      amount: data.amount,
      status: 'completed'
    });

    return { success: true, transactionId };
  }

  @Post('refund')
  async refund(@Body() data: { sagaId: string }) {
    console.log(\`Refunding payment for saga: \${data.sagaId}\`);
    
    const payment = this.payments.get(data.sagaId);
    if (payment) {
      payment.status = 'refunded';
      this.payments.set(data.sagaId, payment);
    }

    return { refunded: true };
  }
}`,
      tags: ['microservices', 'saga', 'distributed-transactions', 'compensation'],
      explanation: 'Saga pattern implementation for handling distributed transactions with compensation'
    },
    {
      title: 'Secrets Management and Configuration',
      description: 'Securely manage secrets and configuration with Dapr',
      code: `// config/app.module.ts
import { Module } from '@nl-framework/core';
import { MicroservicesModule } from '@nl-framework/microservices';
import { ConfigService } from './config.service';

@Module({
  imports: [
    MicroservicesModule.forRoot({
      appId: 'user-service',
      appPort: 3001,
      secretStore: {
        name: 'local-secrets',
        type: 'local.file'
      }
    })
  ],
  providers: [ConfigService],
  exports: [ConfigService]
})
export class AppModule {}

// config/config.service.ts
import { Injectable, OnModuleInit } from '@nl-framework/core';
import { DaprClient } from '@nl-framework/microservices';

@Injectable()
export class ConfigService implements OnModuleInit {
  private readonly SECRET_STORE = 'local-secrets';
  private secrets: Map<string, string> = new Map();

  constructor(private daprClient: DaprClient) {}

  async onModuleInit() {
    // Load secrets on startup
    await this.loadSecrets();
  }

  private async loadSecrets() {
    const secretKeys = [
      'database-url',
      'jwt-secret',
      'api-key',
      'stripe-key',
      'sendgrid-key'
    ];

    for (const key of secretKeys) {
      try {
        const secret = await this.daprClient.getSecret(
          this.SECRET_STORE,
          key
        );
        this.secrets.set(key, secret[key]);
        console.log(\`Loaded secret: \${key}\`);
      } catch (error) {
        console.error(\`Failed to load secret \${key}:\`, error.message);
      }
    }
  }

  getSecret(key: string): string | undefined {
    return this.secrets.get(key);
  }

  getDatabaseUrl(): string {
    return this.getSecret('database-url') || 'mongodb://localhost:27017';
  }

  getJwtSecret(): string {
    return this.getSecret('jwt-secret') || 'default-secret';
  }

  getApiKey(service: string): string | undefined {
    return this.getSecret(\`\${service}-key\`);
  }
}

// Usage in services
@Injectable()
export class DatabaseService {
  constructor(private configService: ConfigService) {}

  async connect() {
    const dbUrl = this.configService.getDatabaseUrl();
    // Connect to database using secret URL
    console.log('Connecting to database...');
  }
}

@Injectable()
export class AuthService {
  constructor(private configService: ConfigService) {}

  generateToken(user: any) {
    const secret = this.configService.getJwtSecret();
    // Generate JWT with secret
  }
}

@Injectable()
export class EmailService {
  constructor(private configService: ConfigService) {}

  async sendEmail(to: string, subject: string, body: string) {
    const apiKey = this.configService.getApiKey('sendgrid');
    // Send email using SendGrid API key
  }
}

// Dapr secrets configuration (components/secrets.yaml)
/*
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: local-secrets
spec:
  type: secretstores.local.file
  version: v1
  metadata:
  - name: secretsFile
    value: ./secrets.json
*/

// secrets.json (for local development)
/*
{
  "database-url": "mongodb://localhost:27017/myapp",
  "jwt-secret": "super-secret-jwt-key",
  "api-key": "my-api-key",
  "stripe-key": "sk_test_xxx",
  "sendgrid-key": "SG.xxx"
}
*/

// For production, use Azure Key Vault, AWS Secrets Manager, etc.
/*
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: azure-secrets
spec:
  type: secretstores.azure.keyvault
  version: v1
  metadata:
  - name: vaultName
    value: "my-keyvault"
  - name: azureTenantId
    value: "tenant-id"
  - name: azureClientId
    value: "client-id"
  - name: azureClientSecret
    value: "client-secret"
*/`,
      tags: ['microservices', 'dapr', 'secrets', 'configuration'],
      explanation: 'Secure secrets management using Dapr secret stores'
    }
  ],
  
  bestPractices: [
    {
      category: 'Service Design',
      do: [
        {
          title: 'Design services around business capabilities',
          description: 'Each service should represent a business domain',
          code: `// Good - Domain-driven services
order-service/
user-service/
inventory-service/
payment-service/
notification-service/`
        },
        {
          title: 'Use event-driven communication',
          description: 'Prefer async pub/sub over synchronous calls',
          code: `// Publish events
await this.daprClient.publishEvent(
  'pubsub',
  'order.created',
  orderData
);

// Subscribe to events
@EventPattern('order.created')
async handleOrderCreated(@Payload() data: any) {
  // Handle event
}`
        },
        {
          title: 'Implement health checks',
          description: 'Expose health endpoints for monitoring',
          code: `@Get('health')
async healthCheck() {
  return {
    status: 'healthy',
    timestamp: new Date().toISOString()
  };
}`
        }
      ],
      dont: [
        {
          title: 'Don\'t create distributed monoliths',
          description: 'Avoid tight coupling between services',
          code: `// Don't do this - tight coupling
const user = await orderService.getUserFromUserService();
const inventory = await orderService.checkInventory();
const payment = await orderService.processPayment();

// Do this - loose coupling via events
await publishEvent('order.created', orderData);`
        },
        {
          title: 'Don\'t share databases',
          description: 'Each service should own its data',
          code: `// Don't do this
// order-service reading from user-service database

// Do this
// Call user-service API
const user = await daprClient.invokeMethod(
  'user-service',
  'users/123',
  'GET'
);`
        }
      ]
    },
    {
      category: 'Error Handling',
      do: [
        {
          title: 'Implement retry logic',
          description: 'Handle transient failures with retries',
          code: `async function invokeWithRetry(
  appId: string,
  method: string,
  retries: number = 3
) {
  for (let i = 0; i < retries; i++) {
    try {
      return await daprClient.invokeMethod(appId, method, 'GET');
    } catch (error) {
      if (i === retries - 1) throw error;
      await sleep(1000 * (i + 1));
    }
  }
}`
        },
        {
          title: 'Use circuit breakers',
          description: 'Prevent cascading failures',
          code: `// Configure circuit breaker in Dapr
// components/resiliency.yaml
policies:
  circuitBreaker:
    trip: consecutiveFailures > 5
    timeout: 60s`
        },
        {
          title: 'Implement compensating transactions',
          description: 'Handle failures in distributed transactions',
          code: `try {
  await executeStep1();
  await executeStep2();
  await executeStep3();
} catch (error) {
  await compensateStep2();
  await compensateStep1();
  throw error;
}`
        }
      ],
      dont: [
        {
          title: 'Don\'t ignore errors',
          description: 'Always handle service invocation errors',
          code: `// Don't do this
const result = await daprClient.invokeMethod(...);

// Do this
try {
  const result = await daprClient.invokeMethod(...);
} catch (error) {
  console.error('Service invocation failed:', error);
  // Handle error appropriately
}`
        },
        {
          title: 'Don\'t create long chains of synchronous calls',
          description: 'Use async patterns to avoid cascading failures',
          code: `// Don't do this
A -> B -> C -> D -> E  // Cascading failures

// Do this
A -> Event -> [B, C, D, E]  // Parallel processing`
        }
      ]
    },
    {
      category: 'Performance',
      do: [
        {
          title: 'Use state stores wisely',
          description: 'Cache frequently accessed data',
          code: `// Cache user data
await daprClient.saveState('statestore', \`user:\${id}\`, userData);

// Retrieve from cache
const cached = await daprClient.getState('statestore', \`user:\${id}\`);`
        },
        {
          title: 'Batch operations when possible',
          description: 'Reduce network overhead',
          code: `// Batch state operations
await daprClient.saveBulkState('statestore', [
  { key: 'key1', value: 'value1' },
  { key: 'key2', value: 'value2' }
]);`
        },
        {
          title: 'Monitor and trace',
          description: 'Enable distributed tracing',
          code: `// Dapr automatically adds tracing headers
// Configure OpenTelemetry/Zipkin in Dapr config`
        }
      ],
      dont: [
        {
          title: 'Don\'t make unnecessary service calls',
          description: 'Cache data when appropriate',
          code: `// Don't call for every request
const user = await daprClient.invokeMethod(...);

// Cache and reuse
const cached = await cache.get(userId);
if (!cached) {
  const user = await daprClient.invokeMethod(...);
  await cache.set(userId, user);
}`
        },
        {
          title: 'Don\'t store large objects in state store',
          description: 'Use appropriate storage for large data',
          code: `// Don't do this
await daprClient.saveState('statestore', 'large-data', hugeObject);

// Do this
// Store metadata in state, large data in blob storage
await blobStorage.upload(id, hugeObject);
await daprClient.saveState('statestore', 'metadata', { id, url });`
        }
      ]
    }
  ],
  
  troubleshooting: [
    {
      issue: 'Dapr sidecar not connecting',
      symptoms: [
        'Connection refused to localhost:3500',
        'Service not responding',
        'Dapr init failed'
      ],
      solution: 'Ensure Dapr is initialized and sidecar is running',
      code: `# Initialize Dapr
dapr init

# Check Dapr status
dapr --version

# Run application with Dapr
dapr run --app-id my-service --app-port 3000 --dapr-http-port 3500 bun run start

# Check if Dapr sidecar is running
curl http://localhost:3500/v1.0/healthz`
    },
    {
      issue: 'Events not being delivered',
      symptoms: [
        'Published events not received',
        'EventPattern not triggering',
        'Pub/sub not working'
      ],
      solution: 'Check pub/sub component configuration and subscriptions',
      code: `// Verify pub/sub component (components/pubsub.yaml)
/*
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: pubsub
spec:
  type: pubsub.redis
  version: v1
  metadata:
  - name: redisHost
    value: localhost:6379
*/

// Check subscription endpoint
curl http://localhost:3000/dapr/subscribe

// Should return subscription list
// [{"pubsubname":"pubsub","topic":"order.created","route":"/events/order.created"}]

// Check Dapr logs
dapr logs --app-id my-service`
    },
    {
      issue: 'Service invocation failing',
      symptoms: [
        'Cannot invoke service',
        '404 or 500 errors',
        'Service not found'
      ],
      solution: 'Verify service app-id and ensure both services are running with Dapr',
      code: `// Ensure service is running with correct app-id
dapr run --app-id target-service --app-port 3001 bun run start

// Invoke using correct app-id
await daprClient.invokeMethod(
  'target-service',  // Must match app-id
  'endpoint',
  'GET'
);

// Test manually
curl http://localhost:3500/v1.0/invoke/target-service/method/endpoint

// List running Dapr apps
dapr list`
    },
    {
      issue: 'State not persisting',
      symptoms: [
        'State lost after restart',
        'Cannot retrieve saved state',
        'State store errors'
      ],
      solution: 'Check state store component configuration',
      code: `// Verify state store component (components/statestore.yaml)
/*
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
spec:
  type: state.redis
  version: v1
  metadata:
  - name: redisHost
    value: localhost:6379
*/

// Test state operations
await daprClient.saveState('statestore', 'test-key', 'test-value');
const value = await daprClient.getState('statestore', 'test-key');
console.log('Retrieved:', value);

// Check Redis is running
redis-cli ping  // Should return PONG`
    },
    {
      issue: 'Port conflicts',
      symptoms: [
        'Port already in use',
        'Address already in use error',
        'Cannot start service'
      ],
      solution: 'Use different ports for each service',
      code: `// Service 1
dapr run --app-id service1 --app-port 3001 --dapr-http-port 3501 bun start

// Service 2
dapr run --app-id service2 --app-port 3002 --dapr-http-port 3502 bun start

// Service 3
dapr run --app-id service3 --app-port 3003 --dapr-http-port 3503 bun start

// Check what's using a port
lsof -i :3000  # macOS/Linux
netstat -ano | findstr :3000  # Windows`
    }
  ],
  
  relatedPackages: ['@nl-framework/core', '@nl-framework/platform', '@dapr/dapr'],
  
  changelog: [
    {
      version: '1.0.0',
      changes: [
        'Initial release with MicroservicesModule',
        'Dapr integration for service mesh',
        'Service-to-service invocation',
        'Pub/sub messaging with multiple brokers',
        'Distributed state management',
        'Event pattern decorators: @EventPattern, @MessagePattern',
        'Parameter decorators: @Payload, @Ctx',
        'DaprClient for programmatic access',
        'State store operations',
        'Secrets management',
        'Bindings support',
        'Distributed tracing integration'
      ]
    }
  ]
};
