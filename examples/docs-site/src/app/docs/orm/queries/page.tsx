import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { CodeBlock } from "@/components/shared/simple-code-block";

const likeSnippet = `import { Inject, Injectable } from '@nl-framework/core';
import { getRepositoryToken, type OrmRepository } from '@nl-framework/orm';
import { User } from '../entities/user.document';

@Injectable()
export class DirectoryService {
  constructor(@Inject(getRepositoryToken(User)) private readonly users: OrmRepository<User>) {}

  async search(term: string) {
    const pattern = new RegExp(term.replace(/[-/\\^$*+?.()|[\]{}]/g, '.'), 'i');
    return this.users.find({
      $or: [{ email: { $regex: pattern } }, { name: { $regex: pattern } }],
    });
  }
}`;

const partialSnippet = `await this.users.find(
  { email: { $regex: /^ops\./, $options: 'i' }, plan: { $in: ['pro', 'enterprise'] } },
  {
    projection: { email: 1, name: 1, plan: 1 },
    sort: { createdAt: -1 },
    limit: 50,
  },
);`;

const aggregationSnippet = `import { Inject, Injectable } from '@nl-framework/core';
import { getDatabaseToken } from '@nl-framework/orm';
import type { Db } from 'mongodb';

@Injectable()
export class RevenueService {
  constructor(@Inject(getDatabaseToken('billing')) private readonly db: Db) {}

  async monthlyTotals() {
    return this.db.collection('invoices').aggregate([
      { $match: { paidAt: { $exists: true } } },
      {
        $group: {
          _id: { $dateTrunc: { date: '$paidAt', unit: 'month' } },
          total: { $sum: '$amount' },
        },
      },
      { $sort: { _id: 1 } },
    ]).toArray();
  }
}`;

const pipelineWithRepositorySnippet = `import { Inject, Injectable } from '@nl-framework/core';
import { getConnectionToken, getRepositoryToken, type OrmConnection, type OrmRepository } from '@nl-framework/orm';
import type { Collection } from 'mongodb';
import { Invoice } from '../entities/invoice.document';

@Injectable()
export class AgingService {
  private collection: Collection<Invoice>;

  constructor(
    @Inject(getConnectionToken()) private readonly connection: OrmConnection,
    @Inject(getRepositoryToken(Invoice)) private readonly invoices: OrmRepository<Invoice>,
  ) {}

  async agingBuckets() {
    if (!this.collection) {
      this.collection = await this.connection.getCollection(Invoice);
    }

    return this.collection.aggregate([
      { $match: { status: 'unpaid' } },
      {
        $project: {
          customerId: 1,
          daysOutstanding: {
            $dateDiff: { startDate: '$issuedAt', endDate: '$$NOW', unit: 'day' },
          },
        },
      },
      {
        $bucket: {
          groupBy: '$daysOutstanding',
          boundaries: [0, 30, 60, 90, 120],
          default: '120+',
          output: { count: { $sum: 1 } },
        },
      },
    ]).toArray();
  }
}`;

const bestPracticesSnippet = `// Request-scoped service keeping tenant context
await this.moduleRef.resolve(getRepositoryToken(User, tenantConnection), { strict: false });

// Prefer projection for large documents
await this.users.find({ plan: 'enterprise' }, { projection: { email: 1, name: 1 } });

// Combine soft-delete filters manually when reading archives
await this.users.find({ deletedAt: { $ne: null } }, { withDeleted: true });`;

export const metadata: Metadata = {
  title: "ORM complex queries · Nael Platform",
  description: "Pattern matching, aggregation pipelines, and advanced Mongo operators using the Nael ORM.",
};

export default function OrmQueriesPage() {
  return (
    <article className="space-y-8">
      <div className="space-y-3">
        <Badge className="bg-slate-100 text-slate-900 dark:bg-slate-900/30 dark:text-slate-50">ORM</Badge>
        <h1 className="text-4xl font-semibold tracking-tight">Complex queries</h1>
        <p className="text-lg text-muted-foreground">
          The ORM gives you ergonomic repositories for common CRUD, but you can still tap into Mongo's richer query operators—regex, buckets, pipelines,
          and computed projections—without abandoning the DI-friendly APIs.
        </p>
      </div>

      <section className="space-y-4" id="like">
        <h2 className="text-2xl font-semibold">Pattern matching ($regex / $like)</h2>
        <p className="text-muted-foreground">
          Mongo does not support SQL's <code>LIKE</code>, but <code>$regex</code> covers the same ground. Construct the pattern once, escape user input,
          and pass it directly through <code>find()</code>. You can still combine it with other filters or projections.
        </p>
        <CodeBlock code={likeSnippet} title="Fuzzy search via regex" />
        <CodeBlock code={partialSnippet} title="Mix regex with projections" />
      </section>

      <section className="space-y-4" id="aggregation">
        <h2 className="text-2xl font-semibold">Aggregation pipelines</h2>
        <p className="text-muted-foreground">
          For analytics, buckets, or computed metrics, resolve the underlying Mongo <code>Db</code> via <code>getConnectionToken()</code> and call
          <code>collection.aggregate()</code>. Pipelines run inside the same connection pool and share configuration with the rest of your app.
        </p>
        <CodeBlock code={aggregationSnippet} title="Run a pipeline from a service" />
      </section>

      <section className="space-y-4" id="repository-pipelines">
        <h2 className="text-2xl font-semibold">Pipelines from repositories</h2>
        <p className="text-muted-foreground">
          If you prefer to start from an existing repository, you can reach for the underlying collection instance. Keep this in a dedicated service and
          document the escape hatch so teammates know when aggregation logic bypasses the higher-level repository helpers.
        </p>
        <CodeBlock code={pipelineWithRepositorySnippet} title="Aggregate using the repository collection" />
      </section>

      <section className="space-y-4" id="tips">
        <h2 className="text-2xl font-semibold">Best practices</h2>
        <p className="text-muted-foreground">
          Advanced queries can still play nicely with scopes and tenancy. Keep these guardrails in mind:
        </p>
        <CodeBlock code={bestPracticesSnippet} title="Operational tips" />
        <ul className="list-disc pl-6 text-muted-foreground">
          <li>Stick to request-scoped services when a query depends on tenant or auth context; resolve per-request repositories via <code>ModuleRef</code>.</li>
          <li>Always escape user input before passing it to <code>$regex</code> to avoid unintended patterns.</li>
          <li>Use projections aggressively to limit payload size for dashboards or autocomplete endpoints.</li>
          <li>Document any raw collection access so future maintainers know where aggregation code lives.</li>
        </ul>
      </section>
    </article>
  );
}
