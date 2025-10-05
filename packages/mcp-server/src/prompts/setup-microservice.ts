import { Prompt } from '@modelcontextprotocol/sdk/types.js';

export const setupMicroservicePrompt: Prompt = {
  name: 'setup-microservice',
  description: 'Guide the user through setting up a microservice with Dapr and event-driven messaging',
  arguments: [
    {
      name: 'serviceName',
      description: 'Name of the microservice (e.g., "orders", "payments", "notifications")',
      required: true
    },
    {
      name: 'pubsubTopics',
      description: 'Comma-separated list of topics to publish/subscribe (e.g., "order.created, order.completed")',
      required: false
    },
    {
      name: 'withStateStore',
      description: 'Whether to include state store integration (true/false)',
      required: false
    }
  ]
};

export async function handleSetupMicroservice(args: {
  serviceName?: string;
  pubsubTopics?: string;
  withStateStore?: string;
}) {
  const { serviceName = 'example', pubsubTopics, withStateStore } = args;
  const includeStateStore = withStateStore === 'true';
  
  const moduleClassName = `${serviceName.charAt(0).toUpperCase() + serviceName.slice(1)}ServiceModule`;
  const eventHandlerName = `${serviceName.charAt(0).toUpperCase() + serviceName.slice(1)}EventHandler`;
  
  // Parse topics or use defaults
  const topics = pubsubTopics 
    ? pubsubTopics.split(',').map(t => t.trim())
    : [`${serviceName}.created`, `${serviceName}.updated`];

  const prompt = `# Setting up ${serviceName} Microservice with Dapr

Let me guide you through setting up an event-driven microservice with Nael Framework and Dapr.

## Prerequisites

1. **Install Dapr CLI**:
\`\`\`bash
# macOS
brew install dapr/tap/dapr-cli

# Windows (PowerShell)
powershell -Command "iwr -useb https://raw.githubusercontent.com/dapr/cli/master/install/install.ps1 | iex"

# Linux
wget -q https://raw.githubusercontent.com/dapr/cli/master/install/install.sh -O - | /bin/bash
\`\`\`

2. **Initialize Dapr**:
\`\`\`bash
dapr init
\`\`\`

## Step 1: Install Dependencies

\`\`\`bash
bun add @nl-framework/core @nl-framework/microservices @nl-framework/platform @nl-framework/logger
\`\`\`

## Step 2: Create Dapr Components

Create \`.dapr/components/pubsub.yaml\`:

\`\`\`yaml
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
    - name: redisPassword
      value: ""
\`\`\`
${includeStateStore ? `
Create \`.dapr/components/statestore.yaml\`:

\`\`\`yaml
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
    - name: redisPassword
      value: ""
    - name: actorStateStore
      value: "true"
\`\`\`
` : ''}

## Step 3: Create Event Handler

Create \`src/handlers/${serviceName}.handler.ts\`:

\`\`\`typescript
import { Injectable } from '@nl-framework/core';
import { 
  EventHandler, 
  Subscribe, 
  MicroserviceClient${includeStateStore ? ',\n  StateStore' : ''}
} from '@nl-framework/microservices';
import { LoggerFactory, Logger } from '@nl-framework/logger';

${topics.map(topic => {
  const eventName = topic.split('.').map(part => 
    part.charAt(0).toUpperCase() + part.slice(1)
  ).join('');
  return `interface ${eventName}Event {
  id: string;
  // Add your event fields
  timestamp: Date;
}
`;
}).join('\n')}

@Injectable()
@EventHandler()
export class ${eventHandlerName} {
  private logger: Logger;

  constructor(
    private microserviceClient: MicroserviceClient,
    loggerFactory: LoggerFactory${includeStateStore ? ',\n    private stateStore: StateStore' : ''}
  ) {
    this.logger = loggerFactory.getLogger(${eventHandlerName}.name);
  }

${topics.map((topic, index) => {
  const eventName = topic.split('.').map(part => 
    part.charAt(0).toUpperCase() + part.slice(1)
  ).join('');
  return `  @Subscribe('pubsub', '${topic}')
  async handle${eventName}(event: ${eventName}Event) {
    this.logger.info('Received ${topic} event', { eventId: event.id });

    try {
      // Process the event
      this.logger.info('Processing ${topic}', { eventId: event.id });

${includeStateStore ? `      // Save state
      await this.stateStore.save('${serviceName}-state', \`\${event.id}\`, {
        processedAt: new Date(),
        status: 'completed',
        event
      });

` : ''}      // Publish follow-up event if needed
      // await this.microserviceClient.publish('pubsub', '${serviceName}.processed', {
      //   originalEventId: event.id,
      //   result: 'success'
      // });

      this.logger.info('Successfully processed ${topic}', { eventId: event.id });
    } catch (error) {
      this.logger.error('Error processing ${topic}', { 
        error, 
        eventId: event.id 
      });
      
      // Optionally publish error event
      await this.microserviceClient.publish('pubsub', '${serviceName}.error', {
        originalEventId: event.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
`;
}).join('\n')}
${includeStateStore ? `
  // Helper method to get state
  async getState(key: string) {
    return await this.stateStore.get('${serviceName}-state', key);
  }

  // Helper method to query state
  async queryState(filter: any) {
    // Implement state query logic
    this.logger.info('Querying state', { filter });
    return [];
  }
` : ''}
}
\`\`\`

## Step 4: Create Service Module

Create \`src/modules/${serviceName}.module.ts\`:

\`\`\`typescript
import { Module } from '@nl-framework/core';
import { MicroservicesModule } from '@nl-framework/microservices';
import { LoggerModule } from '@nl-framework/logger';
import { ${eventHandlerName} } from '../handlers/${serviceName}.handler';

@Module({
  imports: [
    LoggerModule.forRoot({
      level: 'info',
      format: 'json'
    }),
    MicroservicesModule.forRoot({
      appId: '${serviceName}-service',
      daprHost: 'localhost',
      daprPort: 3500,
      serverHost: '0.0.0.0',
      serverPort: 3000
    })
  ],
  providers: [${eventHandlerName}]
})
export class ${moduleClassName} {}
\`\`\`

## Step 5: Create Entry Point

Create \`src/main.ts\`:

\`\`\`typescript
import { NaelFactory } from '@nl-framework/platform';
import { ${moduleClassName} } from './modules/${serviceName}.module';

async function bootstrap() {
  const app = await NaelFactory.create(${moduleClassName});
  await app.listen();
  console.log(\`🚀 ${serviceName} microservice is running\`);
}

bootstrap();
\`\`\`

## Step 6: Run with Dapr

Create a run script \`run-dapr.sh\`:

\`\`\`bash
#!/bin/bash

dapr run \\
  --app-id ${serviceName}-service \\
  --app-port 3000 \\
  --dapr-http-port 3500 \\
  --dapr-grpc-port 50001 \\
  --components-path ./.dapr/components \\
  -- bun run src/main.ts
\`\`\`

Make it executable:
\`\`\`bash
chmod +x run-dapr.sh
\`\`\`

Run the service:
\`\`\`bash
./run-dapr.sh
\`\`\`

## Step 7: Test Event Publishing

Create a test script \`test-events.ts\`:

\`\`\`typescript
async function publishTestEvent() {
  const response = await fetch('http://localhost:3500/v1.0/publish/pubsub/${topics[0]}', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      id: \`test-\${Date.now()}\`,
      timestamp: new Date().toISOString()
    })
  });

  if (response.ok) {
    console.log('✅ Event published successfully');
  } else {
    console.error('❌ Failed to publish event:', await response.text());
  }
}

publishTestEvent();
\`\`\`

Run the test:
\`\`\`bash
bun run test-events.ts
\`\`\`

## Step 8: Multi-Service Communication

If you have multiple services, create a publisher service:

\`\`\`typescript
// In another service
import { MicroserviceClient } from '@nl-framework/microservices';

export class OrderService {
  constructor(private microserviceClient: MicroserviceClient) {}

  async createOrder(orderData: any) {
    // Create order logic
    const order = { id: 'order-123', ...orderData };

    // Publish event to ${serviceName} service
    await this.microserviceClient.publish('pubsub', '${topics[0]}', {
      id: order.id,
      timestamp: new Date()
    });

    return order;
  }
}
\`\`\`

## Architecture Diagram

\`\`\`
┌─────────────────────┐
│  ${serviceName} Service   │
│  (Port 3000)        │
└──────────┬──────────┘
           │
           │ Dapr Sidecar
           │ (Port 3500)
           │
           ▼
    ┌──────────────┐
    │   Pub/Sub    │
    │   (Redis)    │
    └──────────────┘
           │
           │ Events: ${topics.join(', ')}
           │
           ▼
    ┌──────────────┐
    │ Other Services│
    └──────────────┘
\`\`\`

## Monitoring & Debugging

### View Dapr Dashboard
\`\`\`bash
dapr dashboard
\`\`\`
Open http://localhost:8080

### Check Service Health
\`\`\`bash
curl http://localhost:3500/v1.0/health
\`\`\`

### View Dapr Logs
\`\`\`bash
dapr logs --app-id ${serviceName}-service
\`\`\`

### Test Pub/Sub
\`\`\`bash
# Publish test event
curl -X POST http://localhost:3500/v1.0/publish/pubsub/${topics[0]} \\
  -H "Content-Type: application/json" \\
  -d '{"id": "test-123", "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"}'
\`\`\`
${includeStateStore ? `
### Test State Store
\`\`\`bash
# Save state
curl -X POST http://localhost:3500/v1.0/state/statestore \\
  -H "Content-Type: application/json" \\
  -d '[{"key": "test-key", "value": {"foo": "bar"}}]'

# Get state
curl http://localhost:3500/v1.0/state/statestore/test-key
\`\`\`
` : ''}

## Next Steps

1. **Add Service Invocation**: Call other microservices directly
2. **Add Resiliency**: Configure retry policies and circuit breakers
3. **Add Observability**: Integrate with Zipkin/Jaeger for tracing
4. **Add Secrets Management**: Use Dapr secrets for sensitive data
5. **Deploy to Kubernetes**: Use Dapr on k8s for production
6. **Add Service Mesh**: Integrate with Istio or Linkerd
7. **Add API Gateway**: Use Dapr API gateway for external access

## Production Considerations

- Use Redis Cluster for pub/sub in production
- Configure proper logging and monitoring
- Set up health checks and readiness probes
- Implement proper error handling and retry logic
- Use Dapr components for different environments (dev/staging/prod)
- Consider using Azure Service Bus, AWS SNS/SQS, or Google Pub/Sub

Need help with any of these steps? Just ask!
`;

  return {
    messages: [
      {
        role: 'assistant',
        content: {
          type: 'text',
          text: prompt
        }
      }
    ]
  };
}
