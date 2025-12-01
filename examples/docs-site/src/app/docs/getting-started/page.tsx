import { Metadata } from "next";
import Link from "next/link";
import { CodeBlock } from "@/components/shared/simple-code-block";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const installCli = `bun install --global @nl-framework/cli`;
const bootstrapService = `nl new fleet-service
cd fleet-service
bun install
bun run dev`;
const runExample = `bun install
bun run build
bun run --cwd examples/auth-multi-tenant-http start`;

export const metadata: Metadata = {
  title: "Getting Started · Nael Platform",
  description: "Scaffold and run Nael Platform services with the CLI or the monorepo examples.",
};

export default function GettingStartedPage() {
  return (
    <div className="space-y-10">
      <div className="space-y-3">
        <p className="text-sm uppercase tracking-wide text-muted-foreground">Guide</p>
        <h1 className="text-4xl font-semibold">Getting started</h1>
        <p className="max-w-2xl text-muted-foreground">
          Install the CLI, scaffold a Bun-native service, and explore the curated examples. The
          CLI mirrors NestJS ergonomics while running entirely on Bun for faster startup times.
        </p>
      </div>

      <section className="space-y-6">
        <Card className="border-border/80">
          <CardHeader>
            <CardTitle>1. Install the CLI</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              The <code>nl</code> binary ships generators for new services, modules, controllers,
              resolvers, and background workers.
            </p>
            <CodeBlock code={installCli} title="Install globally" />
          </CardContent>
        </Card>
        <Card className="border-border/80">
          <CardHeader>
            <CardTitle>2. Scaffold a service</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Choose HTTP, GraphQL, Better Auth, or microservice blueprints. The CLI always boots a
              NaelFactory instance wired with logging and configuration.
            </p>
            <CodeBlock code={bootstrapService} title="Create fleet-service" />
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">3. Run an example locally</h2>
        <p className="text-muted-foreground">
          Every capability in the README maps to an example inside <code>examples/</code>. Build once at the
          root, then point the <code>--cwd</code> flag to the folder you want to explore.
        </p>
        <CodeBlock code={runExample} title="Multi-tenant HTTP example" />
      </section>

      <section className="space-y-4" id="multi-tenant">
        <h2 className="text-2xl font-semibold">Multi-tenant Better Auth</h2>
        <p className="text-muted-foreground">
          The <code>auth-multi-tenant-*</code> examples demonstrate how to hydrate per-tenant configuration,
          reuse HTTP auth routes, and expose Better Auth via GraphQL. Key steps:
        </p>
        <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
          <li>
            Register tenant metadata inside <code>config/tenants.yaml</code> and expose typed config tokens.
          </li>
          <li>
            Use <code>BetterAuthMultiTenantGuard</code> to bind sessions to the active tenant.
          </li>
          <li>
            Forward the Better Auth HTTP router via <code>BetterAuthProxyModule</code> so SPA clients stay in sync.
          </li>
          <li>Re-use the exported guard in GraphQL resolvers via <code>@UseGuards()</code>.</li>
        </ul>
        <p className="text-sm text-muted-foreground">
          Need a federation-friendly flavor? Switch to <code>examples/auth-multi-tenant-graphql</code> and follow
          the README inside that folder.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">What the CLI creates</h2>
        <ul className="grid gap-3 md:grid-cols-2">
          <li className="rounded-2xl border border-border/70 bg-card p-4">
            <p className="font-medium">`NaelFactory` bootstrap</p>
            <p className="text-sm text-muted-foreground">
              Unified HTTP + GraphQL + Gateway wiring with shared dependency injection context.
            </p>
          </li>
          <li className="rounded-2xl border border-border/70 bg-card p-4">
            <p className="font-medium">Config + Logger</p>
            <p className="text-sm text-muted-foreground">
              YAML-backed config module and structured logging with child logger support.
            </p>
          </li>
          <li className="rounded-2xl border border-border/70 bg-card p-4">
            <p className="font-medium">Ready-to-wire Better Auth</p>
            <p className="text-sm text-muted-foreground">
              Shared session middleware across HTTP and GraphQL plus helpers for proxying the Better Auth routes.
            </p>
          </li>
          <li className="rounded-2xl border border-border/70 bg-card p-4">
            <p className="font-medium">Generator commands</p>
            <p className="text-sm text-muted-foreground">
              <code>nl g module users</code>, <code>nl g controller auth</code>, <code>nl g resolver profile</code> mirror
              NestJS-style ergonomics.
            </p>
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold">Next steps</h2>
        <p className="text-muted-foreground">
          Head to the <Link className="text-primary" href="/docs/installation">Installation guide</Link> for
          per-package instructions or open any folder under <code>examples/</code> for focused walkthroughs.
        </p>
      </section>
    </div>
  );
}
