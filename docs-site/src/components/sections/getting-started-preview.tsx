import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CodeSnippet } from "@/components/shared/code-snippet";

const cliCommand = `bun install --global nl-framework-cli
nl new acme-service
cd acme-service
bun run dev`;

const monorepoCommand = `bun install
bun run build
bun run --cwd examples/basic-http start`;

export function GettingStartedPreview() {
  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm uppercase tracking-wide text-muted-foreground">
          Start in under a minute
        </p>
        <h2 className="text-3xl font-semibold">Getting started</h2>
        <p className="text-muted-foreground">
          Use the CLI for greenfield services or run any of the example folders inside this
          monorepo to explore Better Auth, Dapr, and federation recipes.
        </p>
      </div>
      <Tabs defaultValue="cli">
        <TabsList>
          <TabsTrigger value="cli">CLI workflow</TabsTrigger>
          <TabsTrigger value="monorepo">Existing repo</TabsTrigger>
        </TabsList>
        <TabsContent value="cli" className="space-y-4">
          <CodeSnippet code={cliCommand} label="Scaffold a service" />
          <p className="text-sm text-muted-foreground">
            The CLI wires up Better Auth modules, HTTP controllers, GraphQL resolvers, and
            a ready-to-run NaelFactory bootstrap. See the detailed walkthrough on the{" "}
            <Link className="text-primary" href="/getting-started">
              Getting Started page
            </Link>
            .
          </p>
        </TabsContent>
        <TabsContent value="monorepo" className="space-y-4">
          <CodeSnippet code={monorepoCommand} label="Run an example" />
          <p className="text-sm text-muted-foreground">
            Swap <code>basic-http</code> for <code>auth-multi-tenant-graphql</code>, <code>mongo-orm</code>, or any other
            folder under <code>examples/</code> to deep dive into a scoped capability.
          </p>
        </TabsContent>
      </Tabs>
    </section>
  );
}