import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { CodeBlock } from "@/components/shared/simple-code-block";

const multiConnectionSnippet = `import { Module } from '@nl-framework/core';
import { OrmModule, createMongoDriver } from '@nl-framework/orm';
import { Invoice } from './invoice.document';

@Module({
  imports: [
    OrmModule.forRoot({
      connectionName: 'tenant-us',
      driver: createMongoDriver({ uri: process.env.MONGO_URI_US!, dbName: 'tenant_us' }),
    }),
    OrmModule.forRoot({
      connectionName: 'tenant-eu',
      driver: createMongoDriver({ uri: process.env.MONGO_URI_EU!, dbName: 'tenant_eu' }),
    }),
    OrmModule.forFeature({ connectionName: 'tenant-us', entities: [Invoice] }),
    OrmModule.forFeature({ connectionName: 'tenant-eu', entities: [Invoice] }),
  ],
})
export class TenantOrmModule {}`;

const moduleRefSnippet = `import { Inject, Injectable, ModuleRef, Scope } from '@nl-framework/core';
import { getRepositoryToken, type OrmRepository } from '@nl-framework/orm';
import { Invoice } from './invoice.document';

interface TenantContext {
  connection: 'tenant-us' | 'tenant-eu';
  tenantId: string;
}

@Injectable({ scope: Scope.REQUEST })
export class TenantInvoicesService {
  constructor(
    private readonly tenant: TenantContext,
    private readonly moduleRef: ModuleRef,
  ) {}

  async listInvoices() {
    const token = getRepositoryToken(Invoice, this.tenant.connection);
    const repository = (await this.moduleRef.resolve(token, { strict: false })) as OrmRepository<Invoice>;
    return repository.find({ tenantId: this.tenant.tenantId });
  }
}`;

const configSnippet = `const connectionName = tenant.region === 'eu' ? 'tenant-eu' : 'tenant-us';
return {
  connectionName,
  driver: createMongoDriver({
    uri: secrets.getUriFor(tenant),
    dbName: secrets.getDbNameFor(tenant),
  }),
};`;

export const metadata: Metadata = {
  title: "ORM multi-tenancy · Nael Platform",
  description: "Model one connection per region, tenant tier, or customer and resolve repositories dynamically.",
};

export default function OrmMultiTenancyPage() {
  return (
    <article className="space-y-8">
      <div className="space-y-3">
        <Badge className="bg-slate-100 text-slate-900 dark:bg-slate-900/30 dark:text-slate-50">ORM</Badge>
        <h1 className="text-4xl font-semibold tracking-tight">Multi-tenant storage</h1>
        <p className="text-lg text-muted-foreground">
          Some apps dedicate a database per region or customer. The ORM lets you register multiple connections in the same process and route requests to
          the right repository without keeping global singletons.
        </p>
      </div>

      <section className="space-y-4" id="connections">
        <h2 className="text-2xl font-semibold">One module, many connections</h2>
        <p className="text-muted-foreground">
          Call <code>OrmModule.forRoot()</code> for each tenant slice. Give every connection a descriptive name so repositories, seeds, and tokens stay
          unambiguous. Feature modules then import <code>OrmModule.forFeature()</code> per connection to expose the right repositories.
        </p>
        <CodeBlock code={multiConnectionSnippet} title="Register multiple connections" />
      </section>

      <section className="space-y-4" id="resolver">
        <h2 className="text-2xl font-semibold">Resolve repositories at runtime</h2>
        <p className="text-muted-foreground">
          Combine execution-context data (tenant IDs, regions) with <code>ModuleRef</code> to pick the correct repository on demand. Because repository
          tokens include the connection name, the DI container keeps each tenant isolated while still running inside the same app instance.
        </p>
        <CodeBlock code={moduleRefSnippet} title="Target repositories dynamically" />
      </section>

      <section className="space-y-4" id="configuration">
        <h2 className="text-2xl font-semibold">Async tenant configuration</h2>
        <p className="text-muted-foreground">
          Pair <code>forRootAsync()</code> with BetterAuth or your own tenant registry to fetch secrets per tenant. The factory can compute the
          connection name and driver settings on the fly, returning a unique URI per tenant.
        </p>
        <CodeBlock code={configSnippet} title="Compute driver options per tenant" />
      </section>

      <section className="space-y-4" id="seeds">
        <h2 className="text-2xl font-semibold">Seeding per tenant</h2>
        <p className="text-muted-foreground">
          Use the <code>connections</code> option on <code>@Seed</code> so only relevant seeds run for each connection. Seed history is scoped to both the
          connection name and environment, so regional databases stay in sync without extra bookkeeping.
        </p>
      </section>

      <section className="space-y-4" id="tips">
        <h2 className="text-2xl font-semibold">Tips</h2>
        <ul className="list-disc pl-6 text-muted-foreground">
          <li>Expose connection names through constants to avoid typos (<code>export const EU_DB = 'tenant-eu';</code>).</li>
          <li>Combine per-tenant repositories with request-scoped caches so the same request does not resolve the same repository twice.</li>
          <li>Keep monitoring and migrations per connection—<code>getConnectionToken(name)</code> makes it easy to build health endpoints.</li>
        </ul>
      </section>
    </article>
  );
}
