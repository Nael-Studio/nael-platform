import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { CodeBlock } from "@/components/shared/simple-code-block";

const connectionSnippet = `import { Module } from '@nl-framework/core';
import { ConfigModule } from '@nl-framework/config';
import { createPool } from 'mysql2/promise';

export const MYSQL_POOL = Symbol('mysql:pool');

@Module({
  imports: [ConfigModule.forRoot()],
  providers: [
    {
      provide: MYSQL_POOL,
      useFactory: async (config: ConfigService) => {
        const credentials = config.get('database.mysql');
        return createPool({
          uri: credentials.url,
          connectionLimit: credentials.pool ?? 5,
        });
      },
      inject: [ConfigService],
    },
  ],
  exports: [MYSQL_POOL],
})
export class DatabaseModule {};`;

const repositorySnippet = `import { Inject, Injectable, Scope } from '@nl-framework/core';
import { MYSQL_POOL } from './database.module';

@Injectable({ scope: Scope.REQUEST })
export class UsersRepository {
  constructor(@Inject(MYSQL_POOL) private readonly pool: Pool) {}

  async findById(id: string) {
    const [rows] = await this.pool.query('SELECT * FROM users WHERE id = ?', [id]);
    return rows[0] ?? null;
  }
}`;

const transactionsSnippet = `import { Inject, Injectable } from '@nl-framework/core';
import { MYSQL_POOL } from './database.module';

@Injectable()
export class PaymentsService {
  constructor(@Inject(MYSQL_POOL) private readonly pool: Pool) {}

  async transfer(amount: number, from: string, to: string) {
    const connection = await this.pool.getConnection();
    try {
      await connection.beginTransaction();
      await connection.query('UPDATE accounts SET balance = balance - ? WHERE id = ?', [amount, from]);
      await connection.query('UPDATE accounts SET balance = balance + ? WHERE id = ?', [amount, to]);
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
}`;

export const metadata: Metadata = {
  title: "Database techniques · Nael Platform",
  description: "Wire relational or document databases into Nael applications using DI-friendly modules and configuration.",
};

export default function DatabaseTechniquesPage() {
  return (
    <article className="space-y-8">
      <div className="space-y-3">
        <Badge className="bg-sky-100 text-sky-900 dark:bg-sky-900/30 dark:text-sky-50">Techniques</Badge>
        <h1 className="text-4xl font-semibold tracking-tight">Database techniques</h1>
        <p className="text-lg text-muted-foreground">
          Databases sit at the heart of most Nael applications. Whether you use raw drivers, query builders, or the first-class Nael ORM, the goal is
          the same: expose connections through dependency injection, scope transactional work per request, and keep configuration centralized.
        </p>
      </div>

      <section className="space-y-4" id="config">
        <h2 className="text-2xl font-semibold">Centralize credentials</h2>
        <p className="text-muted-foreground">
          Store connection details in the <Link className="text-primary underline" href="/docs/techniques/configuration">configuration module</Link>,
          then register a provider that creates your database client or pool. Export the token so downstream modules can consume the same instance.
        </p>
        <CodeBlock code={connectionSnippet} title="Provide a shared MySQL pool" />
      </section>

      <section className="space-y-4" id="repositories">
        <h2 className="text-2xl font-semibold">Inject repositories per request</h2>
        <p className="text-muted-foreground">
          Mark repositories as <code>Scope.REQUEST</code> when they need access to scoped metadata (tenant, auth context) or transactional state. Using
          the shared pool keeps connection counts stable while still letting you decorate per-request behavior.
        </p>
        <CodeBlock code={repositorySnippet} title="Lightweight repository pattern" />
      </section>

      <section className="space-y-4" id="transactions">
        <h2 className="text-2xl font-semibold">Manage transactions explicitly</h2>
        <p className="text-muted-foreground">
          When working with raw drivers, keep transactions inside services so they can participate in the same DI graph as your controllers, guards, or
          jobs. Always release connections inside <code>finally</code> blocks and surface errors through domain exceptions.
        </p>
        <CodeBlock code={transactionsSnippet} title="Transactional service" />
      </section>

      <section className="space-y-4" id="orm">
        <h2 className="text-2xl font-semibold">Looking for the Nael ORM?</h2>
        <p className="text-muted-foreground">
          Nael ships an opinionated ORM with schema migrations, repositories, and multi-tenant helpers. This page covers low-level integration using raw
          drivers. For advanced scenarios—entity mapping, hooks, tenancy—head over to the dedicated guide.
        </p>
        <p>
          <Link className="text-primary underline" href="/docs/orm/overview">
            Explore the ORM docs →
          </Link>
        </p>
      </section>

      <section className="space-y-4" id="tips">
        <h2 className="text-2xl font-semibold">Best practices</h2>
        <ul className="list-disc pl-6 text-muted-foreground">
          <li>Expose database clients through symbols to avoid accidental global singletons.</li>
          <li>Use request-scoped services to capture tenant IDs or trace IDs before executing queries.</li>
          <li>Keep ORM-specific logic in dedicated modules so lower-level services can swap implementations easily.</li>
        </ul>
      </section>
    </article>
  );
}
