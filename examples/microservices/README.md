# Microservices Example

This example demonstrates how to build event-driven microservices with NL Framework using NestJS-style message patterns and Dapr for pub/sub.

## Features

- **Message Pattern Decorators**: Handle incoming events with `@MessagePattern` and `@EventPattern`
- **Pub/Sub Integration**: Publish and consume events via Dapr's Redis pub/sub
- **HTTP + Messaging**: Combine HTTP endpoints with asynchronous message handling
- **Order Processing Flow**: Complete example showing order creation, status updates, and event-driven processing

## Architecture

```
┌─────────────────┐
│  HTTP Request   │
│  POST /orders   │
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│  OrdersHttpController   │
│  (REST API)             │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  OrdersService          │
│  (Business Logic)       │
└────────┬────────────────┘
         │
         │ emit('order.created')
         ▼
┌─────────────────────────┐
│  Dapr Sidecar           │
│  (Pub/Sub Broker)       │
└────────┬────────────────┘
         │
         │ deliver event
         ▼
┌─────────────────────────┐
│  OrdersController       │
│  @MessagePattern        │
│  @EventPattern          │
└─────────────────────────┘
```

## Prerequisites

### 1. Install Dapr CLI

**macOS:**
```bash
brew install dapr/tap/dapr-cli
```

**Linux:**
```bash
wget -q https://raw.githubusercontent.com/dapr/cli/master/install/install.sh -O - | /bin/bash
```

**Windows (PowerShell):**
```powershell
powershell -Command "iwr -useb https://raw.githubusercontent.com/dapr/cli/master/install/install.ps1 | iex"
```

Verify installation:
```bash
dapr --version
```

### 2. Initialize Dapr

Initialize Dapr with default components (includes Redis):
```bash
dapr init
```

This will:
- Download Dapr runtime binaries
- Start Redis container (for pub/sub and state store)
- Start Zipkin container (for tracing)
- Create `~/.dapr` configuration directory

Verify Dapr is running:
```bash
dapr --version
docker ps  # Should show redis and zipkin containers
```

### 3. Start Redis (if not using Dapr init)

If you prefer manual Redis setup:
```bash
docker run -d --name redis -p 6379:6379 redis:7-alpine
```

## Running the Example

### 1. Install Dependencies

From the repository root:
```bash
bun install
bun run build
```

### 2. Start the Service with Dapr

From the `examples/microservices` directory:

```bash
# Using the npm script (recommended)
bun run dapr

# Or manually
dapr run \
  --app-id orders-service \
  --app-port 3000 \
  --dapr-http-port 3500 \
  --resources-path ./dapr \
  -- bun run start
```

**Dapr CLI Parameters:**
- `--app-id`: Unique identifier for this service (used for service invocation)
- `--app-port`: Port where your HTTP server listens (3000)
- `--dapr-http-port`: Port for Dapr HTTP API (3500)
- `--resources-path`: Path to Dapr component definitions (./dapr)

The service will start on `http://localhost:3000` with Dapr sidecar on port 3500.

### 3. Test the Service

**Create an Order (HTTP):**
```bash
curl -X POST http://localhost:3000/orders/create \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "customer-123",
    "items": [
      { "productId": "product-1", "quantity": 2 },
      { "productId": "product-2", "quantity": 1 }
    ]
  }'
```

**Health Check:**
```bash
curl http://localhost:3000/orders/health
```

**Publish Event Directly via Dapr:**
```bash
curl -X POST http://localhost:3500/v1.0/publish/redis-pubsub/order.created \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "customer-456",
    "items": [{ "productId": "product-3", "quantity": 5 }],
    "total": 50
  }'
```

## Component Configuration

### Redis Pub/Sub Component

The `dapr/redis-pubsub.yaml` component definition:

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
    - name: redisPassword
      value: ""
```

### Configuration Options

Edit `config/default.yaml` to customize:

```yaml
microservices:
  dapr:
    httpPort: 3500    # Dapr HTTP port
    grpcPort: 50001   # Dapr gRPC port (not used in this example)
    componentsPath: ./dapr
  pubsub:
    name: redis-pubsub  # Must match component metadata.name AND createMicroservicesModule({ pubsubName })
    type: redis
    config:
      host: localhost
      port: 6379
```

## Code Overview

### Message Handler (OrdersController)

Handlers receive the **deserialized payload directly**. Guards, interceptors,
pipes, and exception filters run around every handler — exactly like HTTP.

```typescript
@Injectable()
export class OrdersController {
  // Pub/sub event — auto-subscribed (see below). Fire-and-forget.
  @EventPattern('order.created')
  async onOrderCreated(payload: NewOrderEvent) {
    // ...persist the order
  }

  // Request/response — invocable via client.send('orders.get', ...)
  @MessagePattern('orders.get')
  async getOrder(payload: { orderId: string }) {
    return { success: true, order: this.orders.get(payload.orderId) };
  }
}
```

### Publishing & invoking (OrdersService)

```typescript
@Injectable()
export class OrdersService {
  constructor(private readonly client: MicroserviceClient) {}

  // Fire-and-forget pub/sub event.
  async publishNewOrder(data: NewOrderEvent) {
    await this.client.emit('order.created', data);
  }

  // Request/response over Dapr service invocation.
  async fetchOrder(orderId: string) {
    return this.client.send('orders.get', { orderId }, { appId: 'orders-service', timeout: 5000 });
  }
}
```

### Automatic pub/sub subscriptions

There is **no manual subscription step**. On startup the microservices module
serves `GET /dapr/subscribe`, returning one entry per `@EventPattern` handler:

```bash
curl http://localhost:3000/dapr/subscribe
# [{ "pubsubname": "redis-pubsub", "topic": "order.created", "route": "/_nl/msg/order.created" }, ...]
```

Dapr reads that document, subscribes to each topic, and delivers events to the
generated route — which runs the handler through the full pipeline. Each
`@MessagePattern` also gets a `POST /_nl/msg/{pattern}` route so `send()` can
invoke it. `@EventPattern` handlers are **not** exposed for invocation.

### Module Registration

```typescript
@Module({
  imports: [
    createMicroservicesModule({
      controllers: [OrdersController],  // Register message handlers
    }),
  ],
  controllers: [OrdersHttpController],  // HTTP endpoints
  providers: [OrdersService],
})
export class AppModule {}
```

## Production Deployment

### Kubernetes with Dapr

1. **Enable Dapr on Kubernetes:**
```bash
dapr init -k
```

2. **Add Dapr annotations to your deployment:**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: orders-service
spec:
  template:
    metadata:
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "orders-service"
        dapr.io/app-port: "3000"
    spec:
      containers:
        - name: orders-service
          image: your-registry/orders-service:latest
          ports:
            - containerPort: 3000
```

3. **Apply Redis component:**
```bash
kubectl apply -f dapr/redis-pubsub.yaml
```

### Docker Compose

```yaml
version: '3.8'
services:
  orders-service:
    build: .
    ports:
      - "3000:3000"
    environment:
      - APP_PORT=3000
    depends_on:
      - redis

  orders-dapr:
    image: "daprio/daprd:latest"
    command: [
      "./daprd",
      "-app-id", "orders-service",
      "-app-port", "3000",
      "-dapr-http-port", "3500",
      "-resources-path", "/components"
    ]
    volumes:
      - "./dapr:/components"
    network_mode: "service:orders-service"
    depends_on:
      - orders-service

  redis:
    image: "redis:7-alpine"
    ports:
      - "6379:6379"
```

## Monitoring & Debugging

### View Dapr Logs

```bash
dapr logs --app-id orders-service
```

### Dapr Dashboard

```bash
dapr dashboard

# Opens at http://localhost:8080
```

### Check registered subscriptions

The framework advertises subscriptions to Dapr; inspect the document it serves:

```bash
curl http://localhost:3000/dapr/subscribe
```

## Advanced Patterns

### Request/Response with `send()`

```typescript
// Invoke another service over Dapr and await the typed result.
const result = await client.send<OrderResponse>(
  'orders.get',
  { orderId: '123' },
  { appId: 'orders-service', timeout: 5000 },
);
// A non-2xx response throws MicroserviceInvocationException (carrying status + body).
```

### Error Handling

```typescript
@EventPattern('order.failed')
async handleFailure(payload: { orderId: string; error: string }) {
  // A throw here returns a RETRY status to Dapr; a guard deny returns DROP.
}
```

### Message Filtering

```typescript
@MessagePattern({ cmd: 'order.create', version: 'v2' })
async createOrderV2(payload: CreateOrderV2) {
  // Handle versioned/object message patterns.
}
```

## Troubleshooting

**Service not receiving messages:**
- Verify Dapr sidecar is running: `dapr list`
- Check component configuration matches pub/sub name
- Ensure Redis is accessible: `redis-cli ping`

**Connection refused errors:**
- Check Dapr ports (3500 for HTTP, 50001 for gRPC)
- Verify app-port matches your HTTP server port

**Messages not persisting:**
- Redis must be running and accessible
- Check component `redisHost` configuration

## Next Steps

- Add more services and inter-service communication
- Implement service invocation for synchronous calls
- Add state management with Dapr state stores
- Integrate distributed tracing with Zipkin/Jaeger
- Deploy to Kubernetes with Dapr enabled

## Resources

- [Dapr Documentation](https://docs.dapr.io/)
- [Dapr Pub/Sub Guide](https://docs.dapr.io/developing-applications/building-blocks/pubsub/)
- [NL Framework Microservices Package](../../packages/microservices/README.md)
