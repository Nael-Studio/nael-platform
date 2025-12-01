import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { CodeBlock } from "@/components/shared/simple-code-block";

const initSnippet = `import { Injectable, OnModuleInit } from '@nl-framework/core';
import { createClient } from 'redis';

@Injectable()
export class CacheService implements OnModuleInit {
  private client = createClient({ url: process.env.REDIS_URL });

  async onModuleInit() {
    await this.client.connect();
  }

  async get(key: string) {
    return this.client.get(key);
  }
}`;

const destroySnippet = `import { Injectable, OnModuleDestroy } from '@nl-framework/core';
import { Kafka } from 'kafkajs';

@Injectable()
export class EventBus implements OnModuleDestroy {
  private readonly kafka = new Kafka({ clientId: 'app', brokers: ['localhost:9092'] });
  private producer = this.kafka.producer();

  async onModuleInit() {
    await this.producer.connect();
  }

  async onModuleDestroy() {
    await this.producer.disconnect();
  }
}`;

const httpCloseSnippet = `import { createHttpApplication } from '@nl-framework/http';

const app = await createHttpApplication(AppModule, { port: 3000 });
const server = await app.listen();

process.on('SIGTERM', async () => {
  await app.close();
  process.exit(0);
});`;

const bootstrapSnippet = `import { Module, Provider } from '@nl-framework/core';

@Module({
  providers: [CacheService, StatsService],
  bootstrap: [CacheService],
})
export class MetricsModule {}
`;

export const metadata: Metadata = {
  title: "Lifecycle events · Nael Platform",
  description: "Use OnModuleInit, OnModuleDestroy, and bootstrap hooks to manage resources cleanly in Nael modules.",
};

export default function LifecycleEventsPage() {
  return (
    <article className="space-y-8">
      <div className="space-y-3">
        <Badge className="bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-50">Fundamentals</Badge>
        <h1 className="text-4xl font-semibold tracking-tight">Lifecycle events</h1>
        <p className="text-lg text-muted-foreground">
          Providers in Nael can perform setup and teardown logic through lifecycle interfaces. Knowing when these callbacks fire keeps long-lived
          connections healthy, prevents resource leaks, and allows modules to prepare caches before the first request hits.
        </p>
      </div>

      <section className="space-y-4" id="init">
        <h2 className="text-2xl font-semibold">OnModuleInit</h2>
        <p className="text-muted-foreground">
          Implement <code>OnModuleInit</code> to run code immediately after the container creates your provider. This is ideal for establishing database
          connections, warming caches, or scheduling background tasks that should start only once.
        </p>
        <CodeBlock code={initSnippet} title="Connect to Redis during bootstrap" />
        <p className="text-sm text-muted-foreground">
          The container awaits the promise returned by <code>onModuleInit</code>, so make sure long-running work (migrations, hydration) remains bounded
          to avoid delaying the entire application.
        </p>
      </section>

      <section className="space-y-4" id="destroy">
        <h2 className="text-2xl font-semibold">OnModuleDestroy</h2>
        <p className="text-muted-foreground">
          Implement <code>OnModuleDestroy</code> to release external resources during shutdown. The container calls every registered handler as part of
          <code>ApplicationContext.close()</code> and platform <code>close()</code> methods.
        </p>
        <CodeBlock code={destroySnippet} title="Disconnect from Kafka when exiting" />
        <p className="text-sm text-muted-foreground">
          Always wrap network cleanup in try/catch to log failures—shutdown should not crash the process.
        </p>
      </section>

      <section className="space-y-4" id="bootstrap">
        <h2 className="text-2xl font-semibold">Eager bootstrap providers</h2>
        <p className="text-muted-foreground">
          Modules can force specific providers to instantiate during startup via the <code>bootstrap</code> array in <code>@Module</code> metadata.
          This is useful when the provider exposes a background loop or needs to populate shared state before handling traffic.
        </p>
        <CodeBlock code={bootstrapSnippet} title="Bootstrap metrics collectors" />
        <p className="text-sm text-muted-foreground">
          Bootstrapped providers still receive <code>onModuleInit</code> callbacks; the array merely guarantees they are resolved eagerly.
        </p>
      </section>

      <section className="space-y-4" id="platforms">
        <h2 className="text-2xl font-semibold">Finishing up with platform close()</h2>
        <p className="text-muted-foreground">
          HTTP and GraphQL applications expose <code>close()</code> methods that call the underlying <code>ApplicationContext.close()</code>. Invoke
          them during process shutdown signals so <code>OnModuleDestroy</code> handlers run and servers stop accepting connections gracefully.
        </p>
        <CodeBlock code={httpCloseSnippet} title="Graceful shutdown for HTTP" />
      </section>

      <section className="space-y-4" id="tips">
        <h2 className="text-2xl font-semibold">Best practices</h2>
        <ul className="list-disc pl-6 text-muted-foreground">
          <li>Keep lifecycle methods idempotent; Nael might instantiate providers more than once in transient or manual contexts.</li>
          <li>Log lifecycle failures with enough context to troubleshoot (module name, target service, external host).</li>
          <li>Pair every resource acquired in <code>onModuleInit</code> with a corresponding release in <code>onModuleDestroy</code>.</li>
        </ul>
      </section>
    </article>
  );
}
