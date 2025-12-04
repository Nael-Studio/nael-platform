import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CodeSnippet } from "@/components/shared/code-snippet";

const workspaceInstall = `bun install
bun run build`;

const selectiveInstall = `bun add @nl-framework/core @nl-framework/http @nl-framework/graphql @nl-framework/auth @nl-framework/config`;

export function InstallationPreview() {
  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm uppercase tracking-wide text-muted-foreground">
          Installation flows
        </p>
        <h2 className="text-3xl font-semibold">Install the framework</h2>
        <p className="text-muted-foreground">
          Choose between the CLI scaffolder, this monorepo, or cherry-pick packages into an
          existing Bun workspace.
        </p>
      </div>
      <Tabs defaultValue="workspace">
        <TabsList>
          <TabsTrigger value="workspace">Monorepo</TabsTrigger>
          <TabsTrigger value="packages">Individual packages</TabsTrigger>
        </TabsList>
        <TabsContent value="workspace" className="space-y-4">
          <CodeSnippet code={workspaceInstall} label="Install all workspaces" />
          <ul className="list-disc space-y-2 pl-4 text-sm text-muted-foreground">
            <li>Installs every package plus the runnable examples.</li>
            <li>Run <code>bun run --cwd examples/basic-http start</code> to explore.</li>
            <li>Use <code>bun run scripts/build-all.ts</code> before publishing.</li>
          </ul>
        </TabsContent>
        <TabsContent value="packages" className="space-y-4">
          <CodeSnippet code={selectiveInstall} label="Add core packages" />
          <p className="text-sm text-muted-foreground">
            Include `@nl-framework/microservices`, `@nl-framework/orm`, or `@nl-framework/logger`
            as your service footprint grows.
          </p>
        </TabsContent>
      </Tabs>
    </section>
  );
}
