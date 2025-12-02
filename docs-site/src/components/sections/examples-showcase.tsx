const examples = [
  {
    name: "auth-multi-tenant-graphql",
    summary: "Combines Better Auth, tenant guards, and GraphQL resolvers with shared session middleware.",
    command: "bun run --cwd examples/auth-multi-tenant-graphql start",
  },
  {
    name: "federated-graphql",
    summary: "Schema-first Apollo Federation subgraph with resolver discovery and NLFactory wiring.",
    command: "bun run --cwd examples/federated-graphql start",
  },
  {
    name: "microservices",
    summary: "Dapr-based pub/sub microservice with message patterns, cron workers, and deployment notes.",
    command: "bun run --cwd examples/microservices dapr",
  },
  {
    name: "scheduler",
    summary: "Bun Worker-powered cron, interval, and timeout decorators with runtime registry APIs.",
    command: "bun run --cwd examples/scheduler start",
  },
];

export function ExamplesShowcase() {
  return (
    <section className="space-y-4">
      <div className="space-y-2">
        <p className="text-sm uppercase tracking-wide text-muted-foreground">Hands-on references</p>
        <h2 className="text-3xl font-semibold">Examples directory</h2>
        <p className="text-muted-foreground">
          Every capability in the README ships with a runnable sample. Switch the folder name
          to explore a different scenario.
        </p>
      </div>
      <div className="space-y-3">
        {examples.map((example) => (
          <div
            key={example.name}
            className="rounded-2xl border border-border/80 bg-card px-5 py-4 text-sm"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium">{example.name}</p>
                <p className="text-muted-foreground">{example.summary}</p>
              </div>
              <code className="rounded-md border border-border/60 bg-muted px-3 py-1 font-mono text-xs">
                {example.command}
              </code>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
