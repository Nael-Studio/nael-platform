import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { CodeBlock } from "@/components/shared/simple-code-block";

const rootSnippet = `import { Module } from '@nl-framework/core';
import { OrmModule, createMongoDriver } from '@nl-framework/orm';

@Module({
  imports: [
    OrmModule.forRoot({
      driver: createMongoDriver({
        uri: process.env.MONGO_URI!,
        dbName: 'app-db',
      }),
      connectionName: 'primary',
      autoRunSeeds: true,
      seedEnvironment: process.env.APP_ENV ?? process.env.NODE_ENV ?? 'default',
    }),
  ],
})
export class AppModule {}`;

const asyncSnippet = `import { Module } from '@nl-framework/core';
import { ConfigModule, ConfigService } from '@nl-framework/config';
import { OrmModule, createMongoDriver } from '@nl-framework/orm';
import { InitialUsersSeed } from './seeds/initial-users.seed';

@Module({
  imports: [
    ConfigModule,
    OrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connectionName: config.get('database.connectionName', 'default'),
        driver: createMongoDriver({
          uri: config.get('database.mongo.uri'),
          dbName: config.get('database.mongo.dbName'),
        }),
        autoRunSeeds: config.get('database.seeds.autoRun', false),
        seeds: [InitialUsersSeed],
      }),
    }),
  ],
})
export class AppModule {}`;

const tokensSnippet = `import { Inject, Injectable } from '@nl-framework/core';
import { getConnectionToken, getDatabaseToken, type OrmConnection } from '@nl-framework/orm';
import type { Db } from 'mongodb';

@Injectable()
export class HealthService {
  constructor(
    @Inject(getConnectionToken()) private readonly connection: OrmConnection,
    @Inject(getDatabaseToken()) private readonly db: Db,
  ) {}

  async ping() {
    await this.connection.ensureConnection();
    return this.db.command({ ping: 1 });
  }
}`;

export const metadata: Metadata = {
  title: "Nael ORM overview · Nael Platform",
  description: "Install and register the Nael ORM, connect drivers, and expose connection tokens across your application.",
};

export default function OrmOverviewPage() {
  return (
    <article className="space-y-8">
      <div className="space-y-3">
        <Badge className="bg-slate-100 text-slate-900 dark:bg-slate-900/30 dark:text-slate-50">ORM</Badge>
        <h1 className="text-4xl font-semibold tracking-tight">Nael ORM overview</h1>
        <p className="text-lg text-muted-foreground">
          The ORM package aligns with Nael's DI container: connections are registered through modules, repositories become injectable providers, and seed
          runners plug into the lifecycle system. Start here if you need a persistent store without wiring raw drivers in every feature module.
        </p>
      </div>

      <section className="space-y-4" id="features">
        <h2 className="text-2xl font-semibold">What you get</h2>
        <ul className="list-disc pl-6 text-muted-foreground">
          <li>Metadata-driven documents with timestamps and soft-delete support out of the box.</li>
          <li>Scoped repositories that expose familiar helpers (<code>find</code>, <code>save</code>, <code>insertOne</code>, <code>softDelete</code>…).</li>
          <li>Seed discovery and a history tracker that keeps deployments idempotent.</li>
          <li>Connection tokens for advanced scenarios (manual transactions, health endpoints, raw driver access).</li>
          <li>Multi-tenant layouts through multiple <code>forRoot()</code> registrations, each with its own connection name.</li>
        </ul>
      </section>

      <section className="space-y-4" id="register">
        <h2 className="text-2xl font-semibold">Register a connection</h2>
        <p className="text-muted-foreground">
          Call <code>OrmModule.forRoot()</code> once per database. Provide a driver—Mongo ships today and additional drivers can be added by exporting the
          <code>OrmDriver</code> interface. Each connection receives a name (defaults to <code>default</code>) so repositories, seeds, and tokens know
          which instance they should attach to.
        </p>
        <CodeBlock code={rootSnippet} title="Bootstrapping the ORM" />
        <p className="text-sm text-muted-foreground">
          Auto-discovered entities and seeds are registered automatically as long as their files are imported before this module executes.
        </p>
      </section>

      <section className="space-y-4" id="async">
        <h2 className="text-2xl font-semibold">Async configuration</h2>
        <p className="text-muted-foreground">
          Use <code>forRootAsync()</code> when URIs, credentials, or feature flags live in the <Link className="text-primary underline" href="/docs/techniques/configuration">configuration module</Link>, BetterAuth tenant resolvers, or secret stores.
          The factory can inject anything from the DI graph before returning the final driver settings.
        </p>
        <CodeBlock code={asyncSnippet} title="Resolve driver settings at runtime" />
      </section>

      <section className="space-y-4" id="tokens">
        <h2 className="text-2xl font-semibold">Connection & database tokens</h2>
        <p className="text-muted-foreground">
          Beyond repositories, you can inject the raw connection or database handle for administrative work. Each helper accepts an optional
          <code>connectionName</code> so multi-database apps remain explicit.
        </p>
        <CodeBlock code={tokensSnippet} title="Inject connection or database handles" />
      </section>

      <section className="space-y-4" id="next">
        <h2 className="text-2xl font-semibold">Next steps</h2>
        <p className="text-muted-foreground">
          Continue to the other ORM guides to dive into documents, repositories, seeding, and multi-tenant setups.
        </p>
        <ul className="list-disc pl-6 text-muted-foreground">
          <li><Link className="text-primary underline" href="/docs/orm/entities">Documents</Link>: define schemas with decorators.</li>
          <li><Link className="text-primary underline" href="/docs/orm/repositories">Repositories</Link>: inject and scope data access.</li>
          <li><Link className="text-primary underline" href="/docs/orm/seeding">Seeding</Link>: automate environment bootstrapping.</li>
          <li><Link className="text-primary underline" href="/docs/orm/multi-tenancy">Multi-tenancy</Link>: route traffic to the right connection.</li>
        </ul>
      </section>
    </article>
  );
}
