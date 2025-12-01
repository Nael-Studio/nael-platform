import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { CodeBlock } from "@/components/shared/simple-code-block";

const tokenBasics = `import { Inject, Injectable, Module } from '@nl-framework/core';

type CacheClient = {
  get(key: string): Promise<string | undefined>;
  set(key: string, value: string): Promise<void>;
};

export const CACHE_TOKEN = Symbol('CACHE_CLIENT');

@Injectable()
export class CacheService {
  constructor(@Inject(CACHE_TOKEN) private readonly cache: CacheClient) {}

  async getOrSet(key: string, compute: () => Promise<string>) {
    const cached = await this.cache.get(key);
    if (cached) {
      return cached;
    }
    const value = await compute();
    await this.cache.set(key, value);
    return value;
  }
}

@Module({
  providers: [
    {
      provide: CACHE_TOKEN,
      useValue: createCacheClient(), // imagine this establishes a Redis connection
    },
    CacheService,
  ],
  exports: [CACHE_TOKEN, CacheService],
})
export class CacheModule {}`;

const classAliasSnippet = `import { Injectable, Module } from '@nl-framework/core';

abstract class MailClient {
  abstract send(to: string, subject: string, body: string): Promise<void>;
}

@Injectable()
class SendgridMailer implements MailClient {
  async send(to: string, subject: string, body: string) {
    /* call vendor API */
  }
}

@Injectable()
class LocalMailer implements MailClient {
  async send(to: string, subject: string, body: string) {
    console.log('mail', { to, subject, body });
  }
}

const mailerProvider = {
  provide: MailClient,
  useClass: process.env.NODE_ENV === 'development' ? LocalMailer : SendgridMailer,
};

@Module({
  providers: [mailerProvider],
  exports: [MailClient],
})
export class NotificationsModule {}`;

const factoryProviderSnippet = `import { Module } from '@nl-framework/core';
import { ConfigService } from '../config/config.service';
import { Logger } from '../logger/logger.service';

const databaseProvider = {
  provide: 'DB_CONNECTION',
  useFactory: async (config: ConfigService, logger: Logger) => {
    const options = config.get('database');
    const connection = await createConnection(options);
    logger.log('[db] connected');
    return connection;
  },
  inject: [ConfigService, Logger],
};

@Module({
  providers: [databaseProvider],
  exports: ['DB_CONNECTION'],
})
export class DatabaseModule {}`;

const forwardRefSnippet = `import { Inject, Injectable, Module, forwardRef } from '@nl-framework/core';

@Injectable()
export class AccountsService {
  constructor(private readonly payments: PaymentsService) {}
}

@Injectable()
export class PaymentsService {
  constructor(
    @Inject(forwardRef(() => AccountsService))
    private readonly accounts: AccountsService,
  ) {}
}

@Module({
  providers: [AccountsService, PaymentsService],
})
export class BillingModule {}`;

export const metadata: Metadata = {
  title: "Custom providers · Nael Platform",
  description:
    "Understand provider tokens, alternative implementations, and factory patterns so you can adapt the IoC container to any integration.",
};

export default function CustomProvidersPage() {
  return (
    <article className="space-y-8">
      <div className="space-y-3">
        <Badge className="bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-50">Fundamentals</Badge>
        <h1 className="text-4xl font-semibold tracking-tight">Custom providers</h1>
        <p className="text-lg text-muted-foreground">
          Everything in Nael is just a provider resolved by a token. By shaping those tokens yourself—value objects, alternate classes, or factories—you
          can plug in third-party SDKs, swap implementations per environment, or stub dependencies in tests without rewriting consumers.
        </p>
      </div>

      <section className="space-y-4" id="tokens">
        <h2 className="text-2xl font-semibold">Tokens and value providers</h2>
        <p className="text-muted-foreground">
          A provider is either a class marked with <code>@Injectable()</code> or an object literal following the <code>Provider</code> union
          (<code>ClassProvider</code>, <code>ValueProvider</code>, or <code>FactoryProvider</code>). Value providers shine when you already have
          an instance—like a database client or preconfigured SDK—and want Nael&rsquo;s container to share it everywhere.
        </p>
        <CodeBlock code={tokenBasics} title="Token with a value provider" />
        <p className="text-sm text-muted-foreground">
          Prefer <code>Symbol</code> tokens for cross-package safety, then inject them with <code>@Inject()</code>. Exporting both the token and the
          consumer class lets downstream modules re-use the same instance without knowing how it is created.
        </p>
      </section>

      <section className="space-y-4" id="use-class">
        <h2 className="text-2xl font-semibold">Alias to another class</h2>
        <p className="text-muted-foreground">
          Sometimes you care about the abstraction (an interface or abstract class) rather than a concrete implementation. <code>useClass</code>
          lets you bind a token to a class at registration time, so the consumer keeps the same constructor signature while the framework decides which
          implementation to instantiate.
        </p>
        <CodeBlock code={classAliasSnippet} title="Environment-aware class provider" />
        <p className="text-sm text-muted-foreground">
          This pattern is perfect for swapping real infrastructure with fakes in development or testing. You can also redeclare the provider inside a
          testing module to override it temporarily.
        </p>
      </section>

      <section className="space-y-4" id="use-factory">
        <h2 className="text-2xl font-semibold">Factory providers & dependencies</h2>
        <p className="text-muted-foreground">
          Factories run after the container resolves anything listed in <code>inject</code>. They may return values synchronously or asynchronously,
          which makes them ideal for bootstrapping SDKs that need configuration, logging, or other providers. Nael will await the Promise before exposing
          the resulting instance to the rest of the application.
        </p>
        <CodeBlock code={factoryProviderSnippet} title="Async factory provider" />
        <p className="text-sm text-muted-foreground">
          You can combine factories with module exports to share expensive singletons (database pools, caches) without leaking implementation details.
          For advanced cases, factories can even emit different values per scope by inspecting request-specific data.
        </p>
      </section>

      <section className="space-y-4" id="forward-ref">
        <h2 className="text-2xl font-semibold">Handling circular dependencies</h2>
        <p className="text-muted-foreground">
          When two providers depend on each other, wrap the token in <code>forwardRef(() =&gt; Token)</code>. The container postpones evaluation until both
          classes are defined, avoiding the dreaded <em>undefined dependency</em> issues.
        </p>
        <CodeBlock code={forwardRefSnippet} title="Using forwardRef inside injections" />
        <p className="text-sm text-muted-foreground">
          Use forward references sparingly—they are a smell that the collaboration might be extracted into a third provider—but they unblock legitimate
          scenarios such as domain services reacting to each other&rsquo;s events.
        </p>
      </section>
    </article>
  );
}
