import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { CodeBlock } from "@/components/shared/simple-code-block";

const install = `bun add @nl-framework/microservices @nl-framework/logger`;

const daprComponent = `# components/pubsub.yaml
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

const consumer = `import { Module, Injectable } from '@nl-framework/core';
import { Logger } from '@nl-framework/logger';
import { EventPattern, createMicroservicesModule } from '@nl-framework/microservices';

@Injectable()
export class NotificationsConsumer {
  constructor(private readonly logger: Logger) {}

  @EventPattern('notifications.email')
  async handleEmail(payload: { to: string; subject: string }) {
    this.logger.info('Sending email', payload);
  }

  @EventPattern({ topic: 'notifications.sms' })
  async handleSms(payload: { to: string; message: string }) {
    this.logger.info('Sending SMS', payload);
  }
}

@Module({
  imports: [
    createMicroservicesModule({
      controllers: [NotificationsConsumer],
      // transport defaults to Dapr pub/sub (redis-pubsub on localhost:3500)
    }),
  ],
  providers: [NotificationsConsumer],
})
export class NotificationsModule {};`;

const producer = `import { Injectable } from '@nl-framework/core';
import { MicroserviceClient } from '@nl-framework/microservices';

@Injectable()
export class OrdersService {
  constructor(private readonly client: MicroserviceClient) {}

  async place(order: { id: string; total: number }) {
    // ...persist the order...
    await this.client.emit('notifications.email', {
      to: 'user@example.com',
      subject: 'Order received',
    });
  }
}
`;

const runDapr = `dapr run --app-id notifications --app-port 4000 --components-path ./components -- bun run dev`;

export const metadata: Metadata = {
  title: "Events · Techniques",
  description: "Publish and handle domain events using the Nael microservices module and Dapr pub/sub.",
};

export default function EventsTechniquesPage() {
  return (
    <article className="space-y-8">
      <div className="space-y-3">
        <Badge className="bg-violet-100 text-violet-900 dark:bg-violet-900/30 dark:text-violet-50">
          Techniques
        </Badge>
        <h1 className="text-4xl font-semibold tracking-tight">Events</h1>
        <p className="text-lg text-muted-foreground">
          Decouple services with domain events. Nael uses the microservices module with Dapr pub/sub by default, giving
          you decorators for consumers and a simple client for producers.
        </p>
      </div>

      <section className="space-y-4" id="install">
        <h2 className="text-2xl font-semibold">Install & configure Dapr</h2>
        <p className="text-muted-foreground">
          Add the microservices package and run a Dapr sidecar with a pub/sub component (Redis shown here). Override
          <code>pubsubName</code>, host, or port via <code>DaprTransportOptions</code> when creating the microservices module.
        </p>
        <CodeBlock code={install} title="Install dependencies" />
        <CodeBlock code={daprComponent} title="Dapr pub/sub component" />
        <CodeBlock code={runDapr} title="Run Dapr sidecar" />
      </section>

      <section className="space-y-4" id="consume">
        <h2 className="text-2xl font-semibold">Handle events with decorators</h2>
        <p className="text-muted-foreground">
          Use <code>@EventPattern</code> to subscribe to topics. Register controllers through <code>createMicroservicesModule</code>
          so handlers are discovered and wired to the Dapr transport.
        </p>
        <CodeBlock code={consumer} title="notifications.module.ts" />
      </section>

      <section className="space-y-4" id="produce">
        <h2 className="text-2xl font-semibold">Publish events</h2>
        <p className="text-muted-foreground">
          Inject <code>MicroserviceClient</code> and call <code>emit()</code> for fire-and-forget events. For request/response,
          use <code>send()</code> (Dapr service invocation) when you need a reply.
        </p>
        <CodeBlock code={producer} title="orders.service.ts" />
      </section>

      <section className="space-y-3" id="tips">
        <h2 className="text-2xl font-semibold">Best practices</h2>
        <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
          <li>Keep events small and idempotent; Dapr may redeliver on failures.</li>
          <li>Use stable topic names per bounded context (e.g., <code>orders.created</code>).</li>
          <li>Log and handle poison messages—DLQ support can be added via Dapr component config.</li>
          <li>Set transport options via config to target different pub/sub backends per environment.</li>
          <li>Combine with <Link className="text-primary underline" href="/docs/techniques/logging">logging</Link> for traceability across services.</li>
        </ul>
      </section>
    </article>
  );
}
