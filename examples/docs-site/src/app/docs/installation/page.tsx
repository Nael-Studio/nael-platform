import { Metadata } from "next";
import Link from "next/link";
import { CodeBlock } from "@/components/shared/simple-code-block";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const workspaceSetup = `git clone git@github.com:Nael-Studio/nael-platform.git
cd nael-platform
bun install`;

const selectivePackages = `bun add @nl-framework/core @nl-framework/platform @nl-framework/http \
  @nl-framework/graphql @nl-framework/config`;

const asyncModules = `bun add @nl-framework/microservices @nl-framework/scheduler`;
const linkCommand = `bun link ../nl-framework-v1/packages/core`;

export const metadata: Metadata = {
  title: "Installation · Nael Platform",
  description:
    "Install Nael Platform from the monorepo or by selectively adding @nl-framework packages to your Bun workspace.",
};

export default function InstallationPage() {
  return (
    <div className="space-y-10">
      <div className="space-y-3">
        <p className="text-sm uppercase tracking-wide text-muted-foreground">Guide</p>
        <h1 className="text-4xl font-semibold">Install Nael Platform</h1>
        <p className="max-w-2xl text-muted-foreground">
          Clone the entire repo for every example or install only the packages you need. Each module lives under the
          <code> @nl-framework</code> scope and is published as native ES modules for Bun runtimes.
        </p>
      </div>

      <Card className="border-border/80">
        <CardHeader>
          <CardTitle>Install the full workspace</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <CodeBlock code={workspaceSetup} title="Clone + install" />
          <ul className="list-disc space-y-2 pl-4 text-sm text-muted-foreground">
            <li>Installs every workspace (packages + examples) in a single Bun install.</li>
            <li>Run <code>bun run build</code> to emit distributable artifacts before publishing.</li>
            <li>
              Use <code>bun run --cwd examples/basic-http start</code> (swap folder names) to explore each scenario.
            </li>
          </ul>
        </CardContent>
      </Card>

      <Card className="border-border/80">
        <CardHeader>
          <CardTitle>Install packages selectively</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <CodeBlock code={selectivePackages} title="Core HTTP + GraphQL stack" />
          <p className="text-sm text-muted-foreground">
            Layer in <code>@nl-framework/auth</code>, <code>@nl-framework/logger</code>, or <code>@nl-framework/orm</code> as your
            service footprint grows. Every package exposes familiar <code>forRoot()</code> and <code>forFeature()</code> helpers
            just like NestJS.
          </p>
        </CardContent>
      </Card>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Microservices & schedulers</h2>
        <p className="text-muted-foreground">
          Add the async modules when you need Dapr-backed pub/sub or Bun Worker cron jobs.
        </p>
        <CodeBlock code={asyncModules} title="Async modules" />
        <ul className="list-disc space-y-2 pl-4 text-sm text-muted-foreground">
          <li>
            Install the <Link className="text-primary" href="https://docs.dapr.io/getting-started/" rel="noreferrer" target="_blank">Dapr CLI</Link>
            and run <code>dapr init</code> before starting <code>examples/microservices</code>.
          </li>
          <li>Use <code>@Cron</code>, <code>@Interval</code>, and <code>@Timeout</code> decorators from the scheduler module.</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Link packages from the CLI</h2>
        <p className="text-muted-foreground">
          Working on the framework and a consuming app simultaneously? Link the local packages and the <code>nl</code> CLI will
          pick them up automatically.
        </p>
        <CodeBlock code={linkCommand} title="Link a local package" />
        <p className="text-sm text-muted-foreground">
          Repeat for <code>@nl-framework/http</code>, <code>@nl-framework/graphql</code>, and any other packages you iterate on.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold">Verify your environment</h2>
        <ul className="list-disc space-y-2 pl-4 text-sm text-muted-foreground">
          <li>Use Bun 1.1+ for best compatibility with the workspace scripts.</li>
          <li>Enable <code>corepack enable</code> if you plan to experiment with pnpm-based linking.</li>
          <li>Set <code>BETTER_AUTH_SECRET</code> and database URLs inside <code>.env</code> or the YAML config files.</li>
        </ul>
        <p className="text-muted-foreground">
          Ready to build something new? Jump back to the <Link className="text-primary" href="/docs/getting-started">Getting Started guide</Link>
          or run <code>nl new awesome-service</code> to scaffold a fresh project.
        </p>
      </section>
    </div>
  );
}
