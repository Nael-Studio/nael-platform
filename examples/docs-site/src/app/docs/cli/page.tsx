import { Metadata } from "next";
import Link from "next/link";
import { CodeBlock } from "@/components/shared/simple-code-block";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const installCli = `bun install --global @nl-framework/cli`;
const newService = `nl new shipping-service --template=graphql --features=auth,redis`;
const generateModule = `nl generate module billing --public`;
const runDoctor = `nl doctor --checks env,versions --fix`;
const runScripts = `nl dev          # starts Bun dev server\nnl start        # production boot\nnl build        # emits dist/ for all packages`;

export const metadata: Metadata = {
  title: "CLI Reference · Nael Platform",
  description: "Full reference for the nl CLI including generators, diagnostics, and workspace scripts.",
};

const commandMatrix = [
  {
    name: "nl new",
    description: "Scaffold a new service with HTTP, GraphQL, Better Auth, or worker templates.",
    flags: "--template --features --package-manager --install",
  },
  {
    name: "nl generate",
    description: "Add modules, controllers, resolvers, providers, schedulers, or Dapr subscribers.",
    flags: "module|controller|resolver|provider|subscriber|cron",
  },
  {
    name: "nl sync",
    description: "Sync versions across packages, apply lint rules, and re-run project references.",
    flags: "--workspace --dry-run",
  },
  {
    name: "nl doctor",
    description: "Run environment diagnostics (Bun version, Dapr, BetterAuth secrets, Docker).",
    flags: "--checks --fix",
  },
];

export default function CliReferencePage() {
  return (
    <div className="space-y-10">
      <div className="space-y-3">
        <p className="text-sm uppercase tracking-wide text-muted-foreground">Reference</p>
        <h1 className="text-4xl font-semibold">`nl` CLI</h1>
        <p className="max-w-2xl text-muted-foreground">
          The CLI wraps Bun scripts, code generators, and project diagnostics so you can stay focused on
          features. Every command mirrors NestJS naming while embracing Bun-native performance.
        </p>
      </div>

      <section className="space-y-6">
        <Card className="border-border/80">
          <CardHeader>
            <CardTitle>Install once</CardTitle>
            <CardDescription>Available through Bun, npm, or pnpm.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <CodeBlock code={installCli} title="Global install" />
            <p className="text-sm text-muted-foreground">
              Prefer local devDependency? Run <code>bun add -D @nl-framework/cli</code> inside your repo and call via
              <code> bun x nl ...</code>.
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/80">
          <CardHeader>
            <CardTitle>Scaffold services</CardTitle>
            <CardDescription>Choose templates + opt-in features.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <CodeBlock code={newService} title="GraphQL template" />
            <p className="text-sm text-muted-foreground">
              Templates ship with sensible defaults: configuration module, structured logger, health checks, and
              pluggable transports. Flags control stack pieces (Redis, queues, federation gateway, Dapr sidecars).
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Generate artifacts</h2>
        <p className="text-muted-foreground">
          Generators respect the current working directory and automatically register the new class inside the
          parent module. Use `--public` to export from the index barrel.
        </p>
        <CodeBlock code={generateModule} title="Public billing module" />
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Everyday scripts</h2>
        <p className="text-muted-foreground">
          `nl` proxies core Bun scripts so CI stays simple. Call <code>nl dev</code> to boot the active service with
          watch mode, or add <code>--cwd</code> to run from any example folder.
        </p>
        <CodeBlock code={runScripts} title="Script shorthands" />
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Command matrix</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {commandMatrix.map((command) => (
            <Card className="border-border/70" key={command.name}>
              <CardHeader>
                <CardTitle>{command.name}</CardTitle>
                <CardDescription>{command.flags}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{command.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Diagnostics</h2>
        <p className="text-muted-foreground">
          `nl doctor` inspects Bun versions, ensures Postgres is reachable, validates Dapr sidecars, and confirms
          Better Auth secrets exist before deployment. Pass <code>--fix</code> to auto-create missing files.
        </p>
        <CodeBlock code={runDoctor} title="Force checks" />
        <p className="text-sm text-muted-foreground">
          Need more? Wire your own health checks and register them via <code>DoctorRegistry.register()</code> inside
          your service bootstrap.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold">Where to go next</h2>
        <p className="text-muted-foreground">
          Review the <Link className="text-primary" href="/docs/installation">installation matrix</Link> or learn how we
          build Better Auth experiences in the <Link className="text-primary" href="/docs/techniques/better-auth">techniques guide</Link>.
        </p>
      </section>
    </div>
  );
}
