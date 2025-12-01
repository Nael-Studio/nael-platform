import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { CodeBlock } from "@/components/shared/simple-code-block";

const factoryRegistration = `import { Module } from '@nl-framework/core';
import { ConfigModule, ConfigService } from '@nl-framework/config';
import { DatabaseModule } from '@acme/database'; // imagine a feature module that exposes forRootAsync

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => ({
        url: config.get('database.url'),
        ssl: config.get('database.sslEnabled'),
        maxConnections: 10,
      }),
    }),
  ],
})
export class AppModule {}`;

const optionsFactorySnippet = `import { Injectable } from '@nl-framework/core';
import type { BetterAuthModuleOptions, BetterAuthOptionsFactory } from '@nl-framework/auth';
import { BetterAuthModule } from '@nl-framework/auth';
import { ConfigService } from '@nl-framework/config';

@Injectable()
class AuthEnvService implements BetterAuthOptionsFactory {
  constructor(private readonly config: ConfigService) {}

  async createBetterAuthOptions(): Promise<BetterAuthModuleOptions> {
    return {
      projectId: this.config.get('auth.projectId'),
      secret: await this.config.getSecret('auth.secret'),
    };
  }
}

@Module({
  imports: [
    BetterAuthModule.registerAsync({
      useClass: AuthEnvService,
      imports: [ConfigModule],
    }),
  ],
})
export class AuthModule {}`;

const useExistingSnippet = `@Module({
  providers: [AuthEnvService],
  exports: [AuthEnvService],
})
export class SharedConfigModule {}

@Module({
  imports: [
    SharedConfigModule,
    BetterAuthModule.registerAsync({
      useExisting: AuthEnvService,
    }),
  ],
})
export class AuthModule {}`;

const lifecycleSnippet = `@Module({
  imports: [CacheModule.forRootAsync({ useFactory: async () => ({ url: process.env.REDIS_URL! }) })],
})
export class AppModule implements OnModuleInit {
  constructor(private readonly cache: CacheService) {}

  async onModuleInit() {
    await this.cache.ping();
  }
}`;

export const metadata: Metadata = {
  title: "Async providers · Nael Platform",
  description:
    "Configure modules and tokens that depend on asynchronous work using useFactory, useClass, and useExisting patterns.",
};

export default function AsyncProvidersPage() {
  return (
    <article className="space-y-8">
      <div className="space-y-3">
        <Badge className="bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-50">Fundamentals</Badge>
        <h1 className="text-4xl font-semibold tracking-tight">Async providers</h1>
        <p className="text-lg text-muted-foreground">
          Not every dependency is ready the moment your module file executes. Async providers let Nael wait for Promises, wire dependencies first,
          and share the resolved value after bootstrapping—perfect for database pools, SDK clients, or secrets loaded from external services.
        </p>
      </div>

      <section className="space-y-4" id="use-factory">
        <h2 className="text-2xl font-semibold">useFactory with injected deps</h2>
        <p className="text-muted-foreground">
          The most flexible form is <code>useFactory</code>. List whatever providers you need inside <code>inject</code>, perform async work, and return
          either the provider value or the options object a module needs. Nael will await the Promise before exposing the dependency downstream.
        </p>
        <CodeBlock code={factoryRegistration} title="DatabaseModule.forRootAsync" />
        <p className="text-sm text-muted-foreground">
          Keep factory functions side-effect free—no global state—and push configuration concerns into dedicated services to simplify testing.
        </p>
      </section>

      <section className="space-y-4" id="use-class">
        <h2 className="text-2xl font-semibold">useClass & factory interfaces</h2>
        <p className="text-muted-foreground">
          Many built-in modules (Config, BetterAuth, ORM, Scheduler) expose an <code>OptionsFactory</code> interface. Implement it when you prefer
          an injectable class over an inline function. Nael instantiates the class once (respecting scope) and calls the factory method.
        </p>
        <CodeBlock code={optionsFactorySnippet} title="BetterAuthModule.registerAsync(useClass)" />
        <p className="text-sm text-muted-foreground">
          Classes can leverage constructor injection, caching, or memoization. They also compose nicely with testing modules that override the provider.
        </p>
      </section>

      <section className="space-y-4" id="use-existing">
        <h2 className="text-2xl font-semibold">useExisting for re-use</h2>
        <p className="text-muted-foreground">
          If a module already provides the correct factory class, <code>useExisting</code> prevents duplicate instances. Nael will reference the
          pre-registered token instead of creating a new class.
        </p>
        <CodeBlock code={useExistingSnippet} title="Sharing an options factory" />
        <p className="text-sm text-muted-foreground">
          This pattern excels in monorepos where multiple features need the same config loader. Export the factory class once, then point to it via
          <code>useExisting</code> everywhere else.
        </p>
      </section>

      <section className="space-y-4" id="lifecycle">
        <h2 className="text-2xl font-semibold">Bootstrapping order & lifecycle hooks</h2>
        <p className="text-muted-foreground">
          Async providers delay application bootstrap until they resolve. You can safely run sanity checks in <code>onModuleInit</code> or
          <code>onApplicationBootstrap</code> knowing the dependencies are ready.
        </p>
        <CodeBlock code={lifecycleSnippet} title="Validating an async provider" />
        <p className="text-sm text-muted-foreground">
          When a provider must refresh periodically (e.g., rotating secrets), create a scoped factory or schedule refresh logic after the app starts.
        </p>
      </section>
    </article>
  );
}
