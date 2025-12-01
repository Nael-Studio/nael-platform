import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { CodeBlock } from "@/components/shared/simple-code-block";

const defaultScopeSnippet = `import { Injectable } from '@nl-framework/core';

@Injectable()
export class FeatureFlagService {
  private cache = new Map<string, boolean>();

  isEnabled(flag: string) {
    return this.cache.get(flag) ?? false;
  }
}`;

const requestScopeSnippet = `import { Injectable, Scope } from '@nl-framework/core';
import { RequestContext } from '@nl-framework/http';

@Injectable({ scope: Scope.REQUEST })
export class RequestLogger {
  constructor(private readonly ctx: RequestContext) {}

  log(message: string) {
    console.log('[' + this.ctx.request.url + ']', message);
  }
}`;

const transientScopeSnippet = `import { Injectable, Scope, Inject } from '@nl-framework/core';
import { randomUUID } from 'node:crypto';

@Injectable({ scope: Scope.TRANSIENT })
export class JobIdFactory {
  readonly id = randomUUID();
}

@Injectable()
export class JobsService {
  constructor(@Inject(JobIdFactory) private readonly jobIdFactory: JobIdFactory) {}

  run() {
    return this.jobIdFactory.id;
  }
}`;

const customContextSnippet = `import { Injectable, Scope } from '@nl-framework/core';
import { GraphqlExecutionContext } from '@nl-framework/graphql';

@Injectable({ scope: Scope.REQUEST })
export class TenantContext {
  private tenantId?: string;

  setFromExecution(ctx: GraphqlExecutionContext) {
    this.tenantId = ctx.getContext().tenantId;
  }

  getId() {
    return this.tenantId;
  }
}`;

const manualContextSnippet = `const app = await createHttpApplication(AppModule);
const appContext = app.getApplicationContext();
const contextId = appContext.createContextId('job-42');

try {
  const tenant = await appContext.get(TenantContext, { contextId });
  tenant.setFromExecution(jobContext);
  await jobRunner.execute(tenant);
} finally {
  appContext.releaseContext(contextId);
}`;

export const metadata: Metadata = {
  title: "Injection scopes · Nael Platform",
  description: "Understand singleton, request, and transient lifecycles in the Nael IoC container.",
};

export default function InjectionScopesPage() {
  return (
    <article className="space-y-8">
      <div className="space-y-3">
        <Badge className="bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-50">Fundamentals</Badge>
        <h1 className="text-4xl font-semibold tracking-tight">Injection scopes</h1>
        <p className="text-lg text-muted-foreground">
          Providers can live for the entire application, per incoming request, or be created every time they are injected. Choosing the right scope keeps
          expensive dependencies cached while still giving you access to per-request metadata when you need it.
        </p>
      </div>

      <section className="space-y-4" id="singleton">
        <h2 className="text-2xl font-semibold">Singleton (default)</h2>
        <p className="text-muted-foreground">
          Without extra options, every <code>@Injectable()</code> is a singleton. It is instantiated once during application bootstrap and shared with all
          consumers. Use this for stateless services, caches, config readers, or clients that should be reused.
        </p>
        <CodeBlock code={defaultScopeSnippet} title="Default singleton provider" />
        <p className="text-sm text-muted-foreground">
          Be careful not to store request-specific data in singletons. Prefer method arguments or scoped providers for that data.
        </p>
      </section>

      <section className="space-y-4" id="request">
        <h2 className="text-2xl font-semibold">Request scope</h2>
        <p className="text-muted-foreground">
          Set <code>scope: Scope.REQUEST</code> to create a new instance per HTTP or GraphQL request. The container ties the lifecycle to the current
          execution context so you can access headers, user info, or trace IDs without manual plumbing.
        </p>
        <CodeBlock code={requestScopeSnippet} title="Request-scoped logger" />
        <p className="text-sm text-muted-foreground">
          Request-scoped services can inject other request-scoped or singleton providers. Avoid injecting them into singletons unless you also mark the
          consuming provider as request-scoped, otherwise Nael will throw a circular scope error.
        </p>
      </section>

      <section className="space-y-4" id="transient">
        <h2 className="text-2xl font-semibold">Transient scope</h2>
        <p className="text-muted-foreground">
          Transient providers are created every time they are injected. They never share state between injections, making them ideal for lightweight value
          objects, builders, or utilities that should produce a fresh instance per use.
        </p>
        <CodeBlock code={transientScopeSnippet} title="Transient factory" />
        <p className="text-sm text-muted-foreground">
          Because transient providers can fan out quickly, keep them cheap to create. They can inject singletons freely.
        </p>
      </section>

      <section className="space-y-4" id="custom-contexts">
        <h2 className="text-2xl font-semibold">Scopes outside HTTP</h2>
        <p className="text-muted-foreground">
          Request scope also applies to GraphQL resolvers, scheduled jobs, and any custom context you establish via the core container. For advanced
          scenarios, you can create your own <em>context IDs</em> to isolate providers per unit of work.
        </p>
        <CodeBlock code={customContextSnippet} title="GraphQL request scope" />
        <CodeBlock code={manualContextSnippet} title="Manually managed context" />
        <p className="text-sm text-muted-foreground">
          To populate data, hook into the relevant execution context (HTTP guards, GraphQL interceptors, schedulers, etc.) and set values on the scoped service.
        </p>
      </section>
    </article>
  );
}
