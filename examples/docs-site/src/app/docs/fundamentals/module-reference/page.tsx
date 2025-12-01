import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { CodeBlock } from "@/components/shared/simple-code-block";

const injectModuleRef = `import { Injectable } from '@nl-framework/core';
import { ModuleRef } from '@nl-framework/core';
import { EmailService } from '../notifications/email.service';

@Injectable()
export class ReportsService {
  constructor(private readonly moduleRef: ModuleRef) {}

  async sendWeeklyReport() {
    const email = await this.moduleRef.resolve(EmailService);
    await email.send('ops@example.com', 'Weekly status', '...');
  }
}`;

const strictResolution = `const cache = await this.moduleRef.resolve(CacheService, {
  strict: true,
});
// Throws if CacheService is not part of the current module tree.`;

const transientLookup = `const exporter = await this.moduleRef.create(ExporterService);
await exporter.export();
// create() bypasses the shared singleton and gives you a fresh instance.`;

const moduleTokenLookup = `const billingModule = this.moduleRef.get('BillingModule', { strict: false });
const billingService = billingModule.get(BillingService);`;

export const metadata: Metadata = {
  title: "Module reference · Nael Platform",
  description: "Use ModuleRef to resolve providers dynamically, create scoped instances, and interact with module-scoped injectors.",
};

export default function ModuleReferencePage() {
  return (
    <article className="space-y-8">
      <div className="space-y-3">
        <Badge className="bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-50">Fundamentals</Badge>
        <h1 className="text-4xl font-semibold tracking-tight">Module reference</h1>
        <p className="text-lg text-muted-foreground">
          <code>ModuleRef</code> exposes the underlying injector so you can look up providers outside of constructor injection. Use it sparingly for
          dynamic workflows, plug-in systems, or bridging circular dependencies.
        </p>
      </div>

      <section className="space-y-4" id="resolve">
        <h2 className="text-2xl font-semibold">Resolving providers at runtime</h2>
        <p className="text-muted-foreground">
          Call <code>moduleRef.resolve(Token)</code> to retrieve a provider using the same injection graph Nael builds at bootstrap. The promise resolves
          once the provider is ready; if it was request-scoped, it will honor the current context.
        </p>
        <CodeBlock code={injectModuleRef} title="Inject ModuleRef" />
      </section>

      <section className="space-y-4" id="strict">
        <h2 className="text-2xl font-semibold">Controlling lookup boundaries</h2>
        <p className="text-muted-foreground">
          By default, <code>resolve()</code> searches the entire module graph. Pass <code>strict: true</code> to restrict the lookup to the current module
          (and its providers). This is useful for enforcing encapsulation.
        </p>
        <CodeBlock code={strictResolution} title="Strict resolution" />
      </section>

      <section className="space-y-4" id="transient">
        <h2 className="text-2xl font-semibold">Creating new instances</h2>
        <p className="text-muted-foreground">
          Use <code>moduleRef.create()</code> when you need a throwaway instance that should not be cached by the container. Nael will construct the
          provider and resolve its dependencies, but ownership stays with the caller.
        </p>
        <CodeBlock code={transientLookup} title="Per-call instances" />
      </section>

      <section className="space-y-4" id="modules">
        <h2 className="text-2xl font-semibold">Accessing module-scoped providers</h2>
        <p className="text-muted-foreground">
          When you need to traverse module boundaries manually, <code>moduleRef.get()</code> accepts strings, class tokens, or symbols. Combine it with
          <code>strict: false</code> to reach exported providers from imported modules.
        </p>
        <CodeBlock code={moduleTokenLookup} title="Look up by module token" />
        <p className="text-sm text-muted-foreground">
          Prefer constructor injection or explicit exports whenever possible; ModuleRef is a powerful escape hatch but can reduce clarity if overused.
        </p>
      </section>
    </article>
  );
}
