import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { CodeBlock } from "@/components/shared/simple-code-block";

const install = `bun add @nl-framework/microservices @nl-framework/logger`;

const daprConfig = `# components/pubsub.yaml (Dapr)
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: redis-pubsub
spec:
  type: pubsub.redis
  version: v1
  metadata:
    - name: redisHost
      value: localhost:6379`;

const consumerModule = `import { Module, Injectable } from '@nl-framework/core';
import { Logger } from '@nl-framework/logger';
import { MicroservicesModule, EventPattern, createMicroservicesModule } from '@nl-framework/microservices';

@Injectable()
export class OrdersConsumer {
  constructor(private readonly logger: Logger) {}

  @EventPattern('orders.created')
  async handleCreated(payload: { id: string; total: number }) {
    this.logger.info('Processing order', payload);
  }
}

@Module({
  imports: [
    createMicroservicesModule({
      // Defaults: daprHost=localhost, daprHttpPort=3500, pubsubName=redis-pubsub
      controllers: [OrdersConsumer],
    }),
  ],
  providers: [OrdersConsumer],
})
export class OrdersModule {}`;

const producer = `import { Injectable } from '@nl-framework/core';
import { MicroserviceClient } from '@nl-framework/microservices';

@Injectable()
export class OrdersService {
  constructor(private readonly client: MicroserviceClient) {}

  async publishOrder(order: { id: string; total: number }) {
    await this.client.emit('orders.created', order); // fire-and-forget to Dapr pubsub
  }

  async getInvoice(id: string) {
    // Request/response via Dapr service invocation
    // Pattern format: "app:method" or { app, method }
    return this.client.send<{ invoiceUrl: string }>('billing:get-invoice', { orderId: id });
  }
}`;

const runDapr = `# terminal 1: start Dapr sidecar with pubsub component mounted
dapr run --app-id orders-api --app-port 3000 --components-path ./components -- bun run dev`;

export const metadata: Metadata = {
  title: "Queues (Dapr) · Techniques",
  description: "Use Dapr pub/sub with the Nael microservices module to publish and consume queue-like workloads without extra brokers.",
};

export default function QueuesTechniquesPage() {
  return (
    <article className="space-y-8">
      <div className="space-y-3">
        <Badge className="bg-emerald-100 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-50">
          Techniques
        </Badge>
        <h1 className="text-4xl font-semibold tracking-tight">Queues with Dapr pub/sub</h1>
        <p className="text-lg text-muted-foreground">
          Ship background work and fan-out flows through Dapr pub/sub. The microservices module wraps the Dapr HTTP API,
          exposing simple decorators for consumers and a client for producers—no BullMQ or custom brokers required.
        </p>
      </div>

      <section className="space-y-4" id="install">
        <h2 className="text-2xl font-semibold">Install & configure</h2>
        <p className="text-muted-foreground">
          Add the microservices package and a Dapr pub/sub component (Redis in this example). The default pubsub name is{" "}
          <code>redis-pubsub</code>; override via <code>DaprTransportOptions</code> if needed.
        </p>
        <CodeBlock code={install} title="Install dependencies" />
        <CodeBlock code={daprConfig} title="Dapr pub/sub component" />
        <CodeBlock code={runDapr} title="Run Dapr sidecar" />
      </section>

      <section className="space-y-4" id="consume">
        <h2 className="text-2xl font-semibold">Consume with decorators</h2>
        <p className="text-muted-foreground">
          Decorate methods with <code>@EventPattern</code> to subscribe to topics. Import <code>createMicroservicesModule</code>{" "}
          to bootstrap the Dapr transport and register handlers automatically.
        </p>
        <CodeBlock code={consumerModule} title="orders.module.ts" />
      </section>

      <section className="space-y-4" id="produce">
        <h2 className="text-2xl font-semibold">Publish messages</h2>
        <p className="text-muted-foreground">
          Inject <code>MicroserviceClient</code> and call <code>emit()</code> to publish to a topic. For request/response,
          use <code>send()</code> which maps to Dapr service invocation (pattern <code>app:method</code> or an object with{" "}
          <code>app</code>/<code>method</code> keys).
        </p>
        <CodeBlock code={producer} title="orders.service.ts" />
      </section>

      <section className="space-y-3" id="guidance">
        <h2 className="text-2xl font-semibold">Best practices</h2>
        <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
          <li>Use stable topic names per bounded context (e.g., <code>orders.created</code>).</li>
          <li>Keep handlers idempotent; Dapr may redeliver messages on failure.</li>
          <li>Set <code>pubsubName</code> and sidecar ports via env/config for each environment.</li>
          <li>Log and dead-letter poison messages inside handlers until DLQ support is wired in.</li>
          <li>Pair with <Link className="text-primary underline" href="/docs/techniques/task-scheduling">task scheduling</Link> for hybrid cron + queue flows.</li>
        </ul>
      </section>
    </article>
  );
}
