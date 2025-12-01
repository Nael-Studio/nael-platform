import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { CodeBlock } from "@/components/shared/simple-code-block";

const basicDocumentSnippet = `import { Document } from '@nl-framework/orm';

@Document()
export class User {
  id!: string;
  email!: string;
  name!: string;
  createdAt!: Date;
  updatedAt!: Date;
  deletedAt?: Date | null;
}`;

const optionsSnippet = `import { Document } from '@nl-framework/orm';

@Document({ collection: 'tenants', timestamps: true, softDelete: false })
export class Tenant {
  id!: string;
  slug!: string;
  plan!: 'free' | 'enterprise';
}`;

const manualRegistrationSnippet = `import { Module } from '@nl-framework/core';
import { OrmModule, createMongoDriver } from '@nl-framework/orm';
import { User } from './user.document';
import { Tenant } from './tenant.document';

@Module({
  imports: [
    OrmModule.forRoot({
      driver: createMongoDriver({ uri: process.env.MONGO_URI!, dbName: 'app-db' }),
      entities: [User, Tenant],
    }),
  ],
})
export class AppModule {}`;

export const metadata: Metadata = {
  title: "ORM documents · Nael Platform",
  description: "Use the @Document decorator to describe collections, timestamps, and soft-delete behavior.",
};

export default function OrmEntitiesPage() {
  return (
    <article className="space-y-8">
      <div className="space-y-3">
        <Badge className="bg-slate-100 text-slate-900 dark:bg-slate-900/30 dark:text-slate-50">ORM</Badge>
        <h1 className="text-4xl font-semibold tracking-tight">Documents & metadata</h1>
        <p className="text-lg text-muted-foreground">
          Entities in the Nael ORM are simple classes annotated with <code>@Document()</code>. Metadata drives collection names, timestamps, soft-delete,
          and auto-discovery so repositories know how to persist your models without extra boilerplate.
        </p>
      </div>

      <section className="space-y-4" id="basics">
        <h2 className="text-2xl font-semibold">Minimal document</h2>
        <p className="text-muted-foreground">
          Decorating a class registers it with the document registry. The default collection name is the kebab-case version of the class name
          (<code>UserPreferences</code> → <code>user-preferences</code>). Timestamps and soft-delete columns are enabled automatically, so repositories
          add <code>createdAt</code>, <code>updatedAt</code>, and <code>deletedAt</code> fields without additional code.
        </p>
        <CodeBlock code={basicDocumentSnippet} title="Smallest document" />
        <p className="text-sm text-muted-foreground">
          The <code>id</code> property is always surfaced as a string even though MongoDB stores <code>_id</code> internally. The repository keeps both in
          sync so your domain logic can work purely with string identifiers.
        </p>
      </section>

      <section className="space-y-4" id="options">
        <h2 className="text-2xl font-semibold">Collection & lifecycle options</h2>
        <p className="text-muted-foreground">
          Customize behavior with the decorator options:
        </p>
        <ul className="list-disc pl-6 text-muted-foreground">
          <li><code>collection</code>: override the inferred name when you need snake_case or shared collections.</li>
          <li><code>timestamps</code>: disable automatic <code>createdAt</code>/<code>updatedAt</code> management if your driver sets them.</li>
          <li><code>softDelete</code>: toggle logical deletes; repositories fall back to permanent deletes when this is <code>false</code>.</li>
        </ul>
        <CodeBlock code={optionsSnippet} title="Explicit collection with hard deletes" />
      </section>

      <section className="space-y-4" id="discovery">
        <h2 className="text-2xl font-semibold">Auto-discovery vs manual registration</h2>
        <p className="text-muted-foreground">
          Any document that is imported before <code>OrmModule.forRoot()</code> runs is discovered automatically. Large apps sometimes prefer to pass an
          explicit <code>entities</code> array to scope a connection to a subset of documents.
        </p>
        <CodeBlock code={manualRegistrationSnippet} title="Scope entities per connection" />
        <p className="text-sm text-muted-foreground">
          Even when you pass <code>entities</code>, decorators are still required so repositories know the collection metadata.
        </p>
      </section>

      <section className="space-y-4" id="tips">
        <h2 className="text-2xl font-semibold">Tips</h2>
        <ul className="list-disc pl-6 text-muted-foreground">
          <li>Keep entity files free of framework-specific imports beyond <code>@Document</code> to encourage reuse in tests.</li>
          <li>Group aggregate helpers (validators, derived getters) directly on the class so repositories can return rich objects.</li>
          <li>When sharing documents across connections, import them once at bootstrap to avoid duplicate registration warnings.</li>
        </ul>
      </section>
    </article>
  );
}
