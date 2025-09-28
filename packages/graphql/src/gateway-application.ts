import type { ApplicationOptions, ClassType, Token, ApplicationContext } from '@nl-framework/core';
import { Application } from '@nl-framework/core';
import { Logger, LoggerFactory } from '@nl-framework/logger';
import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { ApolloGateway, IntrospectAndCompose } from '@apollo/gateway';

export interface FederationSubgraphDefinition {
  name: string;
  url: string;
}

export interface FederationGatewayServerOptions {
  host?: string;
  port?: number;
  subgraphs?: FederationSubgraphDefinition[];
}

export interface FederationGatewayApplicationOptions
  extends ApplicationOptions,
    FederationGatewayServerOptions {}

export interface FederationGatewayListenResult {
  url: string;
}

export interface FederationGatewayListenOptions {
  host?: string;
  port?: number;
  subgraphs?: FederationSubgraphDefinition[];
}

export class FederationGatewayApplication {
  private logger: Logger;
  private apolloServer?: ApolloServer;
  private gateway?: ApolloGateway;

  constructor(
    private readonly context: ApplicationContext,
    private readonly options: FederationGatewayServerOptions,
    private readonly ownsContext: boolean,
  ) {
    const baseLogger = this.context.getLogger().child('FederationGateway');
    this.logger = baseLogger;
    void this.context
      .get<LoggerFactory>(LoggerFactory)
      .then((factory) => {
        this.logger = factory.create({ context: 'FederationGateway' });
      })
      .catch(() => {
        this.logger = baseLogger;
      });
  }

  async listen(options?: number | FederationGatewayListenOptions): Promise<FederationGatewayListenResult> {
    const listenOptions: FederationGatewayListenOptions =
      typeof options === 'number' ? { port: options } : options ?? {};
    const host = listenOptions.host ?? this.options.host ?? '0.0.0.0';
    const port = listenOptions.port ?? this.options.port ?? 4020;
    const subgraphs = listenOptions.subgraphs ?? this.options.subgraphs ?? [];

    if (!subgraphs.length) {
      throw new Error('Federation gateway requires at least one subgraph definition.');
    }

    this.gateway = new ApolloGateway({
      supergraphSdl: new IntrospectAndCompose({
        subgraphs,
      }),
    });

    this.apolloServer = new ApolloServer({
      gateway: this.gateway,
    });

    const serverInfo = await startStandaloneServer(this.apolloServer, {
      listen: {
        host,
        port,
      },
    });

    const { url } = serverInfo as FederationGatewayListenResult;
    this.logger.info(`Apollo Federation gateway started at ${url}`, {
      subgraphs: subgraphs.map((definition) => definition.url),
    });

    return { url };
  }

  async close(): Promise<void> {
    const errors: Error[] = [];

    if (this.apolloServer) {
      try {
        await this.apolloServer.stop();
      } catch (error) {
        errors.push(error instanceof Error ? error : new Error(String(error)));
      }
    }

    if (this.gateway) {
      try {
        await this.gateway.stop();
      } catch (error) {
        errors.push(error instanceof Error ? error : new Error(String(error)));
      }
    }

    this.logger.info('Federation gateway server stopped');

    if (this.ownsContext) {
      try {
        await this.context.close();
      } catch (error) {
        errors.push(error instanceof Error ? error : new Error(String(error)));
      }
    }

    if (errors.length) {
      throw new AggregateError(errors, 'One or more errors occurred while stopping the federation gateway');
    }
  }

  async get<T>(token: Token<T>): Promise<T> {
    return this.context.get(token);
  }

  getConfig<TConfig extends Record<string, unknown>>() {
    return this.context.getConfig<TConfig>();
  }

  getLogger(): Logger {
    return this.logger;
  }
}

export const createFederationGatewayApplication = async (
  rootModule: ClassType,
  options: FederationGatewayApplicationOptions,
): Promise<FederationGatewayApplication> => {
  const { config, logger, ...serverOptions } = options;
  const app = new Application();
  const context = await app.bootstrap(rootModule, { config, logger });
  return new FederationGatewayApplication(context, serverOptions, true);
};

export const createFederationGatewayApplicationFromContext = (
  context: ApplicationContext,
  options: FederationGatewayServerOptions = {},
): FederationGatewayApplication => new FederationGatewayApplication(context, options, false);
