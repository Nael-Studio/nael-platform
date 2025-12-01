import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { CodeBlock } from "@/components/shared/simple-code-block";

const httpContextSnippet = `import { createHttpApplication } from '@nl-framework/http';
import { Controller, Get, Injectable, Scope } from '@nl-framework/core';

@Injectable({ scope: Scope.REQUEST })
class RequestMetadata {
  readonly startedAt = Date.now();
  url?: string;
}

@Controller('health')
class HealthController {
  constructor(private readonly metadata: RequestMetadata) {}

  @Get()
  status() {
    return {
      ok: true,
      receivedAt: this.metadata.startedAt,
      url: this.metadata.url,
    };
  }
}

const app = await createHttpApplication(AppModule);
await app.listen();`;

const guardSnippet = `import { MiddlewareHandler } from '@nl-framework/http';
import { RequestContext } from '@nl-framework/http';
import { TenantContext } from './tenant.context';

export const tenantResolver: MiddlewareHandler = async (ctx, next) => {
  const tenantId = ctx.request.headers.get('x-tenant-id');
  const tenant = await ctx.container.resolve(TenantContext);
  tenant.set(tenantId);
  return next();
};`;

const manualContextSnippet = `import { Application, Scope, Injectable } from '@nl-framework/core';

@Injectable({ scope: Scope.REQUEST })
class JobState {
  id?: string;
}

const app = new Application();
const context = await app.bootstrap(AppModule);

const jobId = context.createContextId('nightly-report');
try {
  const state = await context.get(JobState, { contextId: jobId });
  state.id = 'job-42';
  await runReport(state);
} finally {
  context.releaseContext(jobId);
}`;

const moduleRefSnippet = `import { Injectable, ModuleRef } from '@nl-framework/core';

@Injectable()
class ReportRunner {
  constructor(private readonly moduleRef: ModuleRef) {}

  async execute() {
    const mailer = await this.moduleRef.resolve(MailerService, { strict: false });
    await mailer.send();
  }
}`;

export const metadata: Metadata = {
  title: "Execution context · Nael Platform",
  description: "Understand how Nael propagates context IDs across HTTP, GraphQL, and custom workloads for scoped providers.",
};

export default function ExecutionContextPage() {
  return (
    <article className="space-y-8">
      <div className="space-y-3">
        <Badge className="bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-50">Fundamentals</Badge>
        <h1 className="text-4xl font-semibold tracking-tight">Execution context</h1>
        <p className="text-lg text-muted-foreground">
          The Nael container tracks every unit of work using a <em>context ID</em>. Request-scoped providers, interceptors, and guards all look up that
          ID so cross-cutting data (tenant IDs, trace info, auth state) stays isolated. This page explains how the context flows through HTTP and GraphQL
          platforms and how you can create custom scopes for background jobs or schedulers.
        </p>
      </div>

      <section className="space-y-4" id="http">
        <h2 className="text-2xl font-semibold">HTTP and GraphQL automatically create contexts</h2>
        <p className="text-muted-foreground">
          When you call <code>createHttpApplication()</code> or <code>createGraphqlApplication()</code>, the platform allocates a fresh context ID per
          incoming request, resolves request-scoped providers under that ID, and disposes the context after the response. You can safely inject
          <code>Scope.REQUEST</code> services anywhere in the call tree.
        </p>
        <CodeBlock code={httpContextSnippet} title="Request metadata scoped per HTTP call" />
        <p className="text-sm text-muted-foreground">
          You can still mutate the scoped service inside middleware or guards (see below) and downstream controllers will observe the same instance.
        </p>
      </section>

      <section className="space-y-4" id="propagate">
        <h2 className="text-2xl font-semibold">Propagating data inside a request</h2>
        <p className="text-muted-foreground">
          Inject the request-scoped service inside middleware, guards, or interceptors via <code>ctx.container.resolve()</code>. Whatever you write to
          that instance is visible later in controllers, resolvers, or services resolved from the same context ID.
        </p>
        <CodeBlock code={guardSnippet} title="Attach tenant data from middleware" />
        <p className="text-sm text-muted-foreground">
          Guards and interceptors can use the same pattern. Under the hood, the platform passes the active context ID into the container whenever it
          resolves a dependency.
        </p>
      </section>

      <section className="space-y-4" id="manual">
        <h2 className="text-2xl font-semibold">Creating your own execution contexts</h2>
        <p className="text-muted-foreground">
          Outside HTTP/GraphQL—you might be in a scheduler, CLI command, or background worker—you can still get request-like scoping. Leverage the
          <code>ApplicationContext</code> to create, use, and release context IDs manually.
        </p>
        <CodeBlock code={manualContextSnippet} title="Manual context for background jobs" />
        <p className="text-sm text-muted-foreground">
          Always call <code>releaseContext()</code> in a <code>finally</code> block so the container can dispose transient instances and avoid memory
          leaks.
        </p>
      </section>

      <section className="space-y-4" id="moduleref">
        <h2 className="text-2xl font-semibold">ModuleRef respects the current context</h2>
        <p className="text-muted-foreground">
          If you need to resolve dependencies lazily (e.g., inside a method rather than the constructor), inject <code>ModuleRef</code>. Calls to
          <code>resolve()</code> reuse the active context ID by default, so request-scoped providers remain consistent even when you defer their
          creation.
        </p>
        <CodeBlock code={moduleRefSnippet} title="Lazy resolution with ModuleRef" />
      </section>

      <section className="space-y-4" id="tips">
        <h2 className="text-2xl font-semibold">Best practices</h2>
        <ul className="list-disc pl-6 text-muted-foreground">
          <li>Use descriptive labels when calling <code>createContextId('job-42')</code>; they show up in logs to aid debugging.</li>
          <li>Avoid mixing context IDs. If you spawn async work from a request, pass the context ID explicitly so downstream services can reuse it.</li>
          <li>Request-scoped providers can inject singletons, but the reverse is not allowed—keep singleton services stateless or move them to request scope.</li>
        </ul>
      </section>
    </article>
  );
}
