import { Metadata } from "next";
import { CodeBlock } from "@/components/shared/simple-code-block";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const installGraphql = `bun add @nl-framework/graphql @apollo/subgraph @as-integrations/bun-http`;
const gatewayConfig = `NaelFactory.create(FederationGatewayModule.forRoot({
  supergraphSdl: readFileSync("./supergraph.graphql", "utf8"),
  pollingInterval: 2000,
  buildService: () => new RemoteGraphQLDataSource({
    willSendRequest({ request, context }) {
      request.http?.headers.set("x-tenant", context.tenantId)
    },
  }),
}));`;
const subgraphResolver = `@Resolver(() => Fleet)
export class FleetResolver {
  constructor(private readonly service: FleetService) {}

  @ResolveReference()
  resolveReference(ref: FleetReference) {
    return this.service.lookup(ref.id)
  }
}`;
const graphqlServer = `const app = await NaelFactory.create(GraphQLModule.forRoot({
  autoSchemaFile: join(process.cwd(), "schema.gql"),
  playground: process.env.NODE_ENV !== "production",
  context: ({ req, res }) => ({ req, res, requestId: randomUUID() }),
  plugins: [BetterAuthGraphQLPlugin],
}));
await app.listen();`;

export const metadata: Metadata = {
  title: "GraphQL & Federation · Techniques",
  description: "Guidance for running GraphQL servers, Apollo subgraphs, and Bun-based gateways.",
};

export default function GraphqlTechniquePage() {
  return (
    <div className="space-y-10">
      <div className="space-y-3">
        <p className="text-sm uppercase tracking-wide text-muted-foreground">Techniques</p>
        <h1 className="text-4xl font-semibold">GraphQL & Federation</h1>
        <p className="max-w-2xl text-muted-foreground">
          Build monolith schemas or stitch multiple subgraphs without leaving Bun. Nael offers batteries-included
          modules for Apollo Federation v2, data loaders, persisted queries, and Better Auth-aware contexts.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Install the stack</h2>
        <p className="text-muted-foreground">
          Each example depends on <code>@nl-framework/graphql</code> plus the official Apollo subgraph runtime and
          Bun&apos;s HTTP integration layer.
        </p>
        <CodeBlock code={installGraphql} title="Install GraphQL packages" />
      </section>

      <section className="space-y-6">
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle>Bun GraphQL server</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Bootstrap a schema once and reuse across HTTP + WebSocket transports. The factory wires context objects,
              converters, and introspection defaults for you.
            </p>
            <CodeBlock code={graphqlServer} title="GraphQL module" />
          </CardContent>
        </Card>
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle>Subgraph composition</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Use the federation helper to convert standard resolvers into reference resolvers. Schema directives and
              custom scalars are auto-registered via the module metadata.
            </p>
            <CodeBlock code={subgraphResolver} title="Reference resolver" />
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Gateway best practices</h2>
        <p className="text-muted-foreground">
          The <code>examples/federation-gateway</code> folder demonstrates a Bun-native Apollo Gateway. Poll Uplink or
          self-hosted supergraphs and push tenant metadata through headers.
        </p>
        <CodeBlock code={gatewayConfig} title="Gateway bootstrap" />
        <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
          <li>Attach <code>BetterAuthGraphQLPlugin</code> so user sessions flow across subgraphs.</li>
          <li>Use <code>DataLoaderFactory</code> from @nl-framework/core to dedupe downstream fetches.</li>
          <li>Emit <code>schema.gql</code> artifacts for contract testing via <code>nl generate schema</code>.</li>
          <li>Enable persisted queries using the built-in Redis cache adapter.</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Local dev workflow</h2>
        <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
          <li>Run <code>bun run --cwd examples/federated-graphql dev</code> to boot multiple subgraphs in watch mode.</li>
          <li>Point the gateway to <code>./supergraph.example.graphql</code> until Rover outputs the official build.</li>
          <li>Use <code>nl doctor --checks graphql</code> to ensure SDL + router versions stay aligned.</li>
          <li>Adopt the <code>printSchemaWithDirectives</code> helper when debugging custom directives.</li>
        </ul>
      </section>
    </div>
  );
}
