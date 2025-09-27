import type { ClassType, ApplicationOptions, Token, ApplicationContext } from '@nl-framework/core';
import { Application } from '@nl-framework/core';
import { Logger, LoggerFactory } from '@nl-framework/logger';
import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { buildSubgraphSchema } from '@apollo/subgraph';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { GraphqlSchemaBuilder, type GraphqlBuildOptions } from './schema-builder';

export interface GraphqlServerOptions {
  host?: string;
  port?: number;
  federation?: GraphqlBuildOptions['federation'];
  context?: GraphqlContextFactory;
}

export interface GraphqlApplicationOptions extends ApplicationOptions, GraphqlServerOptions {}

export interface GraphqlListenResult {
  url: string;
}

export interface GraphqlContextBase {
  req: IncomingMessage;
  res: ServerResponse<IncomingMessage>;
}

export type GraphqlContext = GraphqlContextBase & Record<string, unknown>;

export type GraphqlContextFactory = (
  params: GraphqlContextBase,
) => Promise<Record<string, unknown>> | Record<string, unknown>;

export class GraphqlApplication {
  private apolloServer?: ApolloServer<GraphqlContext>;
  private logger: Logger;

  constructor(
    private readonly context: ApplicationContext,
    private readonly options: GraphqlServerOptions,
    private readonly ownsContext: boolean,
  ) {
    const baseLogger = this.context.getLogger().child('GraphqlApplication');
    this.logger = baseLogger;
    void this.context
      .get<LoggerFactory>(LoggerFactory)
      .then((factory) => {
        this.logger = factory.create({ context: 'GraphqlApplication' });
      })
      .catch(() => {
        /* noop */
      });

    const resolverCount = this.context.getResolvers().length;
    this.logger.info(`GraphQL module loaded (resolvers=${resolverCount})`);
  }

  async listen(port?: number): Promise<GraphqlListenResult> {
    const listenPort = port ?? this.options.port ?? 4001;
    const host = this.options.host ?? '0.0.0.0';

    const builder = new GraphqlSchemaBuilder();
    const resolvers = this.context.getResolvers();
    const artifacts = builder.build(resolvers, { federation: this.options.federation });

    if (this.options.federation?.enabled) {
      this.apolloServer = new ApolloServer<GraphqlContext>({
        schema: buildSubgraphSchema({ typeDefs: artifacts.document, resolvers: artifacts.resolvers }),
      });
    } else {
      this.apolloServer = new ApolloServer<GraphqlContext>({
        typeDefs: artifacts.document,
        resolvers: artifacts.resolvers,
      });
    }

    const serverInfo = await startStandaloneServer(this.apolloServer, {
      listen: {
        port: listenPort,
        host,
      },
      context: async ({ req, res }: { req: IncomingMessage; res: ServerResponse<IncomingMessage> }) => {
        const baseContext: GraphqlContext = { req, res };
        if (this.options.context) {
          const extra = await this.options.context({ req, res });
          if (extra && typeof extra === 'object') {
            Object.assign(baseContext, extra);
          }
        }
        return baseContext;
      },
    });

    const { url } = serverInfo as GraphqlListenResult;
    this.logger.info(`NL Framework GraphQL started at ${url}`);

    return { url };
  }

  async get<T>(token: Token<T>): Promise<T> {
    return this.context.get(token);
  }

  getConfig<TConfig extends Record<string, unknown>>() {
    return this.context.getConfig<TConfig>();
  }

  async close(): Promise<void> {
    if (this.apolloServer) {
      await this.apolloServer.stop();
    }

    this.logger.info('GraphQL server stopped');

    if (this.ownsContext) {
      await this.context.close();
    }
  }
}

export const createGraphqlApplication = async (
  rootModule: ClassType,
  options: GraphqlApplicationOptions = {},
): Promise<GraphqlApplication> => {
  const { config, logger, ...serverOptions } = options;
  const app = new Application();
  const context = await app.bootstrap(rootModule, { config, logger });
  return new GraphqlApplication(context, serverOptions, true);
};

export const createGraphqlApplicationFromContext = (
  context: ApplicationContext,
  options: GraphqlServerOptions = {},
): GraphqlApplication => new GraphqlApplication(context, options, false);
