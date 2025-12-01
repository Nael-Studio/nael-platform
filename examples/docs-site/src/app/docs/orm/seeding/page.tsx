import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { CodeBlock } from "@/components/shared/simple-code-block";

const seedSnippet = `import { Seed, type SeederContext } from '@nl-framework/orm';
import { User } from '../entities/user.document';

@Seed({ name: 'initial-users', environments: ['development', 'test'] })
export class InitialUsersSeed {
  async run(context: SeederContext) {
    const users = await context.getRepository(User);
    const existing = await users.count();

    if (existing > 0) {
      return;
    }

    await users.insertMany([
      { email: 'admin@example.com', name: 'Admin' },
      { email: 'dev@example.com', name: 'Developer' },
    ]);
  }
}`;

const runnerSnippet = `import { Inject, Injectable, OnModuleInit } from '@nl-framework/core';
import { getSeedRunnerToken, type SeedRunner } from '@nl-framework/orm';

@Injectable()
export class ManualSeeder implements OnModuleInit {
  constructor(
    @Inject(getSeedRunnerToken('analytics')) private readonly runner: SeedRunner,
  ) {}

  async onModuleInit() {
    await this.runner.run();
  }
}`;

const optionsSnippet = `OrmModule.forRoot({
  driver: createMongoDriver({ uri: process.env.MONGO_URI!, dbName: 'app-db' }),
  autoRunSeeds: process.env.AUTO_RUN_SEEDS !== 'false',
  seedEnvironment: process.env.APP_ENV ?? process.env.NODE_ENV ?? 'default',
});`;

export const metadata: Metadata = {
  title: "ORM seeding · Nael Platform",
  description: "Register seeds, track execution history, and run them automatically or on demand.",
};

export default function OrmSeedingPage() {
  return (
    <article className="space-y-8">
      <div className="space-y-3">
        <Badge className="bg-slate-100 text-slate-900 dark:bg-slate-900/30 dark:text-slate-50">ORM</Badge>
        <h1 className="text-4xl font-semibold tracking-tight">Seeding & migrations</h1>
        <p className="text-lg text-muted-foreground">
          Seeds let you populate fixtures, lookup data, or idempotent migrations whenever a connection boots. Nael tracks which seeds have executed per
          environment and per connection, so restarting your app never results in duplicate documents.
        </p>
      </div>

      <section className="space-y-4" id="decorator">
        <h2 className="text-2xl font-semibold">Create a seed</h2>
        <p className="text-muted-foreground">
          Use the <code>@Seed</code> decorator on a class with a <code>run()</code> method. The decorator accepts an optional name, target connections,
          and the environments it should run in. Inside <code>run</code>, you can ask the context for any repository registered with the same
          connection.
        </p>
        <CodeBlock code={seedSnippet} title="Register a seed" />
      </section>

      <section className="space-y-4" id="autorun">
        <h2 className="text-2xl font-semibold">Auto-run during bootstrap</h2>
        <p className="text-muted-foreground">
          When <code>autoRunSeeds</code> is enabled, the ORM executes seeds as part of module initialization. Each run is recorded in the driver-provided
          history store (Mongo keeps this in <code>orm_seed_history</code>), keyed by seed ID, connection name, and environment.
        </p>
        <CodeBlock code={optionsSnippet} title="Configure seed behavior" />
        <p className="text-sm text-muted-foreground">
          Use <code>seedEnvironment</code> to align with deployment stages. The value is compared case-insensitively against the list declared in
          <code>@Seed</code>.
        </p>
      </section>

      <section className="space-y-4" id="manual">
        <h2 className="text-2xl font-semibold">Manual execution</h2>
        <p className="text-muted-foreground">
          Prefer explicit control? Inject <code>SeedRunner</code> via <code>getSeedRunnerToken(connectionName)</code> and call <code>run()</code>
          yourself—perfect for CLI commands or admin endpoints.
        </p>
        <CodeBlock code={runnerSnippet} title="Trigger seeds manually" />
      </section>

      <section className="space-y-4" id="tips">
        <h2 className="text-2xl font-semibold">Tips</h2>
        <ul className="list-disc pl-6 text-muted-foreground">
          <li>Keep seeds idempotent by checking for existing rows before inserting new ones.</li>
          <li>Use the <code>connections</code> option on <code>@Seed</code> to target replica connections or analytics databases.</li>
          <li>Log progress inside seeds if they perform long-running imports—the driver logger captures durations for history records.</li>
        </ul>
      </section>
    </article>
  );
}
