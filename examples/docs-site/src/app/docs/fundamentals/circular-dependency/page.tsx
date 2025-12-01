import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { CodeBlock } from "@/components/shared/simple-code-block";

const forwardRefProviders = `import { Inject, Injectable, forwardRef } from '@nl-framework/core';

@Injectable()
export class UsersService {
  constructor(
    @Inject(forwardRef(() => PaymentsService))
    private readonly payments: PaymentsService,
  ) {}

  async createUser() {
    await this.payments.provisionWallet();
  }
}

@Injectable()
export class PaymentsService {
  constructor(private readonly users: UsersService) {}

  async provisionWallet() {
    /* ... */
  }
}`;

const moduleForwardRef = `import { Module, forwardRef } from '@nl-framework/core';
import { UsersService } from './users.service';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  providers: [UsersService],
  exports: [UsersService],
  imports: [forwardRef(() => PaymentsModule)],
})
export class UsersModule {}

@Module({
  providers: [PaymentsService],
  exports: [PaymentsService],
  imports: [forwardRef(() => UsersModule)],
})
export class PaymentsModule {}`;

const lazyResolution = `import { Injectable } from '@nl-framework/core';
import { ModuleRef } from '@nl-framework/core';

@Injectable()
export class ReportsService {
  constructor(private readonly moduleRef: ModuleRef) {}

  async run() {
    const exporter = await this.moduleRef.resolve(ExporterService, { strict: false });
    return exporter.export();
  }
}`;

const setterInjection = `import { Injectable, Inject, forwardRef, OnModuleInit } from '@nl-framework/core';

@Injectable()
export class NotificationsService implements OnModuleInit {
  private emailService!: EmailService;

  constructor(@Inject(forwardRef(() => EmailService)) private readonly email: EmailService) {}

  onModuleInit() {
    this.emailService = this.email;
  }
}

@Injectable()
export class EmailService {
  constructor(private readonly notifications: NotificationsService) {}
}`;

export const metadata: Metadata = {
  title: "Circular dependencies · Nael Platform",
  description: "Break circular references between providers and modules using forwardRef, ModuleRef, and lazy resolution patterns.",
};

export default function CircularDependencyPage() {
  return (
    <article className="space-y-8">
      <div className="space-y-3">
        <Badge className="bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-50">Fundamentals</Badge>
        <h1 className="text-4xl font-semibold tracking-tight">Circular dependencies</h1>
        <p className="text-lg text-muted-foreground">
          Sometimes two services need each other. Nael can resolve those cycles when you explicitly signal them with helpers like <code>forwardRef</code>
          or by lazily fetching a provider from <code>ModuleRef</code>. This page covers the common escape hatches and when to reach for them.
        </p>
      </div>

      <section className="space-y-4" id="providers">
        <h2 className="text-2xl font-semibold">Provider-level forwardRef</h2>
        <p className="text-muted-foreground">
          Wrap the token passed to <code>@Inject()</code> in <code>forwardRef()</code> so the container evaluates the reference only after both classes
          are defined. This keeps constructor injection intact while avoiding <em>undefined</em> errors at runtime.
        </p>
        <CodeBlock code={forwardRefProviders} title="Mutual services" />
        <p className="text-sm text-muted-foreground">
          Consider whether the cycle reveals a tighter coupling than necessary. Sometimes extracting a shared interface or domain event eliminates the loop.
        </p>
      </section>

      <section className="space-y-4" id="modules">
        <h2 className="text-2xl font-semibold">Module imports with forwardRef</h2>
        <p className="text-muted-foreground">
          Modules can also depend on each other. When both need to import the other&rsquo;s exports, wrap the module reference in <code>forwardRef</code>
          inside the <code>imports</code> array. Nael will inline a thunk that resolves to the actual module once it is defined.
        </p>
        <CodeBlock code={moduleForwardRef} title="Cross-importing modules" />
      </section>

      <section className="space-y-4" id="lazy">
        <h2 className="text-2xl font-semibold">Lazy resolution via ModuleRef</h2>
        <p className="text-muted-foreground">
          <code>ModuleRef</code> lets you resolve providers on demand, outside of the constructor. Use this when eager injection would create a cycle but
          the dependency is only needed for specific code paths.
        </p>
        <CodeBlock code={lazyResolution} title="Resolving after startup" />
        <p className="text-sm text-muted-foreground">
          Passing <code>{`{ strict: false }`}</code> allows looking up tokens from imported modules. Prefer explicit module exports to keep ownership clear.
        </p>
      </section>

      <section className="space-y-4" id="setters">
        <h2 className="text-2xl font-semibold">Setter or lifecycle injection</h2>
        <p className="text-muted-foreground">
          When you must reference a provider immediately after construction, you can inject a forward reference and assign it during lifecycle hooks
          such as <code>onModuleInit</code>. It&rsquo;s more verbose, but it keeps constructors minimal.
        </p>
        <CodeBlock code={setterInjection} title="Assign in onModuleInit" />
      </section>
    </article>
  );
}
