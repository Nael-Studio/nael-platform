import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { CodeBlock } from "@/components/shared/simple-code-block";

const injectionSnippet = `import { Inject, Injectable } from '@nl-framework/core';
import { getRepositoryToken, type OrmRepository } from '@nl-framework/orm';
import { User } from '../entities/user.document';

@Injectable()
export class UsersService {
  constructor(
    @Inject(getRepositoryToken(User))
    private readonly users: OrmRepository<User>,
  ) {}

  list() {
    return this.users.find();
  }
}`;

const scopedSnippet = `import { Inject, Injectable, Scope } from '@nl-framework/core';
import { getRepositoryToken, type OrmRepository } from '@nl-framework/orm';
import { Invoice } from '../entities/invoice.document';

@Injectable({ scope: Scope.REQUEST })
export class TenantInvoicesService {
  constructor(
    private readonly tenantId: string,
    @Inject(getRepositoryToken(Invoice)) private readonly invoices: OrmRepository<Invoice>,
  ) {}

  findForTenant() {
    return this.invoices.find({ tenantId: this.tenantId });
  }
}`;

const collectionNameSnippet = `import { Inject, Injectable } from '@nl-framework/core';
import { getRepositoryToken, type OrmRepository } from '@nl-framework/orm';
import { User } from '../entities/user.document';

@Injectable()
export class MetadataService {
  constructor(@Inject(getRepositoryToken(User)) private readonly users: OrmRepository<User>) {}

  collection() {
    return this.users.collectionName;
  }
}`;

const entitySnippet = `import { Inject, Injectable } from '@nl-framework/core';
import { getRepositoryToken, type OrmRepository } from '@nl-framework/orm';
import { User } from '../entities/user.document';

@Injectable()
export class MetadataService {
  constructor(@Inject(getRepositoryToken(User)) private readonly users: OrmRepository<User>) {}

  entityCtor() {
    return this.users.entity.name;
  }
}`;

const findSnippet = `import { Inject, Injectable } from '@nl-framework/core';
import { getRepositoryToken, type OrmRepository } from '@nl-framework/orm';
import { User } from '../entities/user.document';

@Injectable()
export class AdminsService {
  constructor(@Inject(getRepositoryToken(User)) private readonly users: OrmRepository<User>) {}

  listPremium() {
    return this.users.find(
      { plan: 'pro' },
      { sort: { createdAt: -1 }, limit: 20, projection: { email: 1, name: 1 } },
    );
  }
}`;

const findOneSnippet = `import { Inject, Injectable } from '@nl-framework/core';
import { getRepositoryToken, type OrmRepository } from '@nl-framework/orm';
import { User } from '../entities/user.document';

@Injectable()
export class UsersLookupService {
  constructor(@Inject(getRepositoryToken(User)) private readonly users: OrmRepository<User>) {}

  async byEmail(email: string) {
    return this.users.findOne({ email }, { withDeleted: true });
  }
}`;

const findByIdSnippet = `import { Inject, Injectable } from '@nl-framework/core';
import { getRepositoryToken, type OrmRepository } from '@nl-framework/orm';
import { User } from '../entities/user.document';

@Injectable()
export class ProfilesService {
  constructor(@Inject(getRepositoryToken(User)) private readonly users: OrmRepository<User>) {}

  async getProfile(id: string) {
    return this.users.findById(id);
  }
}`;

const countSnippet = `import { Inject, Injectable } from '@nl-framework/core';
import { getRepositoryToken, type OrmRepository } from '@nl-framework/orm';
import { User } from '../entities/user.document';

@Injectable()
export class StatsService {
  constructor(@Inject(getRepositoryToken(User)) private readonly users: OrmRepository<User>) {}

  async countAdmins() {
    return this.users.count({ role: 'admin' });
  }
}`;

const insertOneSnippet = `import { Inject, Injectable } from '@nl-framework/core';
import { getRepositoryToken, type OrmRepository } from '@nl-framework/orm';
import { User } from '../entities/user.document';

@Injectable()
export class RegistrationService {
  constructor(@Inject(getRepositoryToken(User)) private readonly users: OrmRepository<User>) {}

  async register(email: string, name: string) {
    return this.users.insertOne({ email, name, plan: 'free' });
  }
}`;

const insertManySnippet = `import { Inject, Injectable } from '@nl-framework/core';
import { getRepositoryToken, type OrmRepository } from '@nl-framework/orm';
import { User } from '../entities/user.document';

@Injectable()
export class SeedService {
  constructor(@Inject(getRepositoryToken(User)) private readonly users: OrmRepository<User>) {}

  bulkInsert(batch: Array<Pick<User, 'email' | 'name'>>) {
    return this.users.insertMany(batch);
  }
}`;

const saveSnippet = `import { Inject, Injectable } from '@nl-framework/core';
import { getRepositoryToken, type OrmRepository } from '@nl-framework/orm';
import { User } from '../entities/user.document';

@Injectable()
export class ProfilesService {
  constructor(@Inject(getRepositoryToken(User)) private readonly users: OrmRepository<User>) {}

  async upsertProfile(id: string, name: string) {
    return this.users.save({ id, name });
  }
}`;

const updateManySnippet = `import { Inject, Injectable } from '@nl-framework/core';
import { getRepositoryToken, type OrmRepository } from '@nl-framework/orm';
import { User } from '../entities/user.document';

@Injectable()
export class BillingService {
  constructor(@Inject(getRepositoryToken(User)) private readonly users: OrmRepository<User>) {}

  async downgradeTrials() {
    return this.users.updateMany({ trialEnded: true }, { plan: 'free' });
  }
}`;

const softDeleteSnippet = `import { Inject, Injectable } from '@nl-framework/core';
import { getRepositoryToken, type OrmRepository } from '@nl-framework/orm';
import { User } from '../entities/user.document';

@Injectable()
export class ArchiveService {
  constructor(@Inject(getRepositoryToken(User)) private readonly users: OrmRepository<User>) {}

  async archive(id: string) {
    return this.users.softDelete({ id });
  }
}`;

const restoreSnippet = `import { Inject, Injectable } from '@nl-framework/core';
import { getRepositoryToken, type OrmRepository } from '@nl-framework/orm';
import { User } from '../entities/user.document';

@Injectable()
export class ArchiveService {
  constructor(@Inject(getRepositoryToken(User)) private readonly users: OrmRepository<User>) {}

  async restore(id: string) {
    return this.users.restore({ id });
  }
}`;

const deleteHardSnippet = `import { Inject, Injectable } from '@nl-framework/core';
import { getRepositoryToken, type OrmRepository } from '@nl-framework/orm';
import { User } from '../entities/user.document';

@Injectable()
export class ComplianceService {
  constructor(@Inject(getRepositoryToken(User)) private readonly users: OrmRepository<User>) {}

  async purge(ids: string[]) {
    return this.users.deleteHard({ id: { $in: ids } });
  }
}`;

const repositoryMethods = [
  {
    name: "collectionName",
    signature: "get collectionName(): string",
    description: "Name of the backing collection/table. Useful for diagnostics and admin endpoints.",
    sample: { code: collectionNameSnippet, title: "Read the collection name" },
  },
  {
    name: "entity",
    signature: "get entity(): DocumentClass<TEntity>",
    description: "Class constructor registered with @Document(). Lets you reuse metadata or decorators.",
    sample: { code: entitySnippet, title: "Inspect the entity constructor" },
  },
  {
    name: "find",
    signature: "find(filter?, options?): Promise<TDocument[]>",
    description: "Query multiple documents with Mongo-style filters plus pagination/sort/projection options.",
    sample: { code: findSnippet, title: "Query with sort, limit, and projection" },
  },
  {
    name: "findOne",
    signature: "findOne(filter?, options?): Promise<TDocument | null>",
    description: "Same inputs as find but returns the first match or null.",
    sample: { code: findOneSnippet, title: "Look up a single document" },
  },
  {
    name: "findById",
    signature: "findById(id, options?): Promise<TDocument | null>",
    description: "Accepts string or ObjectId and automatically converts both id/_id fields.",
    sample: { code: findByIdSnippet, title: "Retrieve by identifier" },
  },
  {
    name: "count",
    signature: "count(filter?, options?): Promise<number>",
    description: "Counts documents using the same filter semantics as find (honors soft-delete unless withDeleted=true).",
    sample: { code: countSnippet, title: "Count documents" },
  },
  {
    name: "insertOne",
    signature: "insertOne(doc): Promise<TDocument>",
    description: "Inserts a single document, generating id/_id and timestamps if missing.",
    sample: { code: insertOneSnippet, title: "Create a single record" },
  },
  {
    name: "insertMany",
    signature: "insertMany(docs): Promise<TDocument[]>",
    description: "Batch insert that normalizes every identifier. Returns persisted copies with ids set.",
    sample: { code: insertManySnippet, title: "Insert a batch" },
  },
  {
    name: "save",
    signature: "save(partial): Promise<TDocument>",
    description: "Upsert helper: updates when id/_id is present, otherwise falls back to insertOne.",
    sample: { code: saveSnippet, title: "Upsert with save" },
  },
  {
    name: "updateMany",
    signature: "updateMany(filter, update): Promise<number>",
    description: "Executes $set/$unset style updates while protecting reserved fields (id, _id). Returns modified count.",
    sample: { code: updateManySnippet, title: "Bulk update documents" },
  },
  {
    name: "softDelete",
    signature: "softDelete(filter): Promise<number>",
    description: "Sets deletedAt (and updatedAt when enabled). Falls back to physical deletes if the entity disabled soft delete.",
    sample: { code: softDeleteSnippet, title: "Soft delete rows" },
  },
  {
    name: "restore",
    signature: "restore(filter): Promise<number>",
    description: "Clears deletedAt so soft-deleted rows become queryable again.",
    sample: { code: restoreSnippet, title: "Restore soft-deleted rows" },
  },
  {
    name: "deleteHard",
    signature: "deleteHard(filter): Promise<number>",
    description: "Irreversibly removes documents. Use for GDPR-style purges or when softDelete=false.",
    sample: { code: deleteHardSnippet, title: "Hard-delete documents" },
  },
];

const operationsSnippet = `async function archiveUser(users: OrmRepository<User>, id: string) {
  const document = await users.findById(id);
  if (!document) {
    throw new Error('User not found');
  }

  await users.softDelete({ id });

  return users.find(
    { plan: document.plan },
    { projection: { email: 1 }, withDeleted: true },
  );
}`;

export const metadata: Metadata = {
  title: "ORM repositories · Nael Platform",
  description: "Inject repositories, scope them per request, and use helper methods for query, persistence, and soft-delete flows.",
};

export default function OrmRepositoriesPage() {
  return (
    <article className="space-y-8">
      <div className="space-y-3">
        <Badge className="bg-slate-100 text-slate-900 dark:bg-slate-900/30 dark:text-slate-50">ORM</Badge>
        <h1 className="text-4xl font-semibold tracking-tight">Repositories</h1>
        <p className="text-lg text-muted-foreground">
          Repositories are injectable data-access classes produced by the active driver. They expose CRUD helpers while honoring metadata set on your
          documents (collection names, timestamps, soft deletes) so your application code can focus on business logic.
        </p>
      </div>

      <section className="space-y-4" id="inject">
        <h2 className="text-2xl font-semibold">Injecting repositories</h2>
        <p className="text-muted-foreground">
          Use <code>getRepositoryToken(Entity, connectionName?)</code> to obtain an injection token. Repositories resolve asynchronously, so you can
          inject them into providers, controllers, or guards without manual wiring.
        </p>
        <CodeBlock code={injectionSnippet} title="Standard repository injection" />
      </section>

      <section className="space-y-4" id="api">
        <h2 className="text-2xl font-semibold">Repository API reference</h2>
        <p className="text-muted-foreground">
          Every driver implements the <code>OrmRepository</code> contract. The Mongo driver exposes the following methods today:
        </p>
        <div className="space-y-3">
          {repositoryMethods.map((method) => (
            <div key={method.name} className="rounded-lg border border-border/50 p-4">
              <p className="font-mono text-sm text-primary">{method.signature}</p>
              <p className="text-sm text-muted-foreground">{method.description}</p>
              {method.sample && (
                <div className="mt-3">
                  <CodeBlock code={method.sample.code} title={method.sample.title} />
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4" id="scope">
        <h2 className="text-2xl font-semibold">Scope repositories per request</h2>
        <p className="text-muted-foreground">
          Mark services as <code>Scope.REQUEST</code> when they must read tenant IDs, trace IDs, or auth context. Repositories participate in the same
          scope, which means request-specific metadata can flow into query filters before running database operations.
        </p>
        <CodeBlock code={scopedSnippet} title="Request-scoped repository consumer" />
      </section>

      <section className="space-y-4" id="operations">
        <h2 className="text-2xl font-semibold">Helper methods</h2>
        <p className="text-muted-foreground">
          The Mongo repository currently ships with helpers you would expect from TypeORM-style APIs. Highlights:
        </p>
        <ul className="list-disc pl-6 text-muted-foreground">
          <li><code>find</code> / <code>findOne</code> / <code>findById</code> with projection, sorting, and pagination passed via options.</li>
          <li><code>insertOne</code> / <code>insertMany</code> for batched writes with automatic identifier management.</li>
          <li><code>save</code> for upserts that preserve timestamps and soft-delete flags.</li>
          <li><code>softDelete</code>, <code>restore</code>, and <code>deleteHard</code> for lifecycle management.</li>
          <li><code>updateMany</code> for partial updates while protecting reserved fields like <code>_id</code>.</li>
        </ul>
        <CodeBlock code={operationsSnippet} title="Using helper methods" />
      </section>

      <section className="space-y-4" id="tips">
        <h2 className="text-2xl font-semibold">Tips</h2>
        <ul className="list-disc pl-6 text-muted-foreground">
          <li>Prefer repositories over injecting raw collections so soft-delete filters stay consistent across your app.</li>
          <li>Use the <code>withDeleted</code> flag in options when you need to audit or restore documents.</li>
          <li>Wrap transactional logic in services (not the repository) so you can inject loggers, mailers, or domain events.</li>
        </ul>
      </section>
    </article>
  );
}
