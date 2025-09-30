import type { Server } from 'bun';
import type { ApplicationOptions, ClassType, Token, ApplicationContext } from '@nl-framework/core';
import { Application } from '@nl-framework/core';
import type { ConfigService } from '@nl-framework/config';
import { Logger, LoggerFactory } from '@nl-framework/logger';
import {
  createHttpApplicationFromContext,
  type HttpApplication,
  type HttpServerOptions,
  type HttpMethod,
  type RequestContext,
} from '@nl-framework/http';
import {
  createGraphqlApplicationFromContext,
  type GraphqlApplication,
  type GraphqlServerOptions,
  type GraphqlListenResult,
  createFederationGatewayApplicationFromContext,
  type FederationGatewayApplication,
  type FederationGatewayServerOptions,
  type FederationGatewayListenResult,
  type FederationGatewayListenOptions,
} from '@nl-framework/graphql';

interface NormalizedHttpOptions {
  enabled: boolean;
  options: HttpServerOptions;
  explicit: boolean;
}

interface NormalizedGraphqlOptions {
  enabled: boolean;
  options: GraphqlServerOptions;
  explicit: boolean;
  path: string;
}

interface NormalizedGatewayOptions {
  enabled: boolean;
  options: FederationGatewayServerOptions;
  explicit: boolean;
}

const normalizeGatewayPath = (path: string): string => {
  if (!path.startsWith('/')) {
    path = `/${path}`;
  }
  if (path.length > 1 && path.endsWith('/')) {
    return path.slice(0, -1);
  }
  return path;
};

const normalizeGraphqlPath = (path: string): string => {
  if (!path.startsWith('/')) {
    path = `/${path}`;
  }
  if (path.length > 1 && path.endsWith('/')) {
    return path.slice(0, -1);
  }
  return path;
};

export interface NaelFactoryHttpOptions extends HttpServerOptions {
  enabled?: boolean;
}

export interface NaelFactoryGraphqlOptions extends GraphqlServerOptions {
  enabled?: boolean;
}

export interface NaelFactoryGatewayOptions extends FederationGatewayServerOptions {
  enabled?: boolean;
}

export interface NaelFactoryOptions extends ApplicationOptions {
  http?: boolean | NaelFactoryHttpOptions;
  graphql?: boolean | NaelFactoryGraphqlOptions;
  gateway?: boolean | NaelFactoryGatewayOptions;
}

/**
 * Options for listening to application servers.
 *
 * @deprecated The `graphql` option has been removed from `NaelListenOptions`.
 * GraphQL is now integrated through HTTP. To expose GraphQL, configure the HTTP server
 * and set the appropriate GraphQL options in `NaelFactoryOptions`.
 * If you previously used `graphql?: number`, please migrate to using the HTTP server
 * and set the GraphQL path as needed.
 * See the migration guide for more details.
 */
export interface NaelListenOptions {
  http?: number;
  gateway?: number | FederationGatewayListenOptions;
}

export interface NaelListenResults {
  http?: Server;
  graphql?: GraphqlListenResult;
  gateway?: FederationGatewayListenResult;
}

export interface NaelApplication {
  getHttpApplication(): HttpApplication | undefined;
  getGraphqlApplication(): GraphqlApplication | undefined;
  getGatewayApplication(): FederationGatewayApplication | undefined;
  listen(options?: NaelListenOptions): Promise<NaelListenResults>;
  close(): Promise<void>;
  get<T>(token: Token<T>): Promise<T>;
  getConfig<TConfig extends Record<string, unknown>>(): ConfigService<TConfig>;
  getLogger(): Logger;
}

class NaelPlatformApplication implements NaelApplication {
  private logger: Logger;
  private closed = false;

  constructor(
    private readonly context: ApplicationContext,
    private readonly httpApp?: HttpApplication,
    private readonly graphqlApp?: GraphqlApplication,
    private readonly gatewayApp?: FederationGatewayApplication,
    private readonly graphqlIntegrationPath?: string,
  ) {
    const baseLogger = this.context.getLogger().child('NaelPlatform');
    this.logger = baseLogger;
    void this.context
      .get<LoggerFactory>(LoggerFactory)
      .then((factory) => {
        this.logger = factory.create({ context: 'NaelPlatform' });
      })
      .catch(() => {
        this.logger = baseLogger;
      });
  }

  getHttpApplication(): HttpApplication | undefined {
    return this.httpApp;
  }

  getGraphqlApplication(): GraphqlApplication | undefined {
    return this.graphqlApp;
  }

  getGatewayApplication(): FederationGatewayApplication | undefined {
    return this.gatewayApp;
  }

  async listen(options: NaelListenOptions = {}): Promise<NaelListenResults> {
    const results: NaelListenResults = {};

    if (!this.httpApp && !this.graphqlApp && !this.gatewayApp) {
      this.logger.warn('listen() invoked but HTTP, GraphQL, and Gateway are all disabled.');
      return results;
    }

    if (this.httpApp) {
      results.http = await this.httpApp.listen(options.http);
    }

    if (this.graphqlApp && this.graphqlIntegrationPath && results.http) {
      const host = results.http.hostname ?? '0.0.0.0';
      const displayHost = host === '0.0.0.0' || host === '::' ? '127.0.0.1' : host;
      const port = results.http.port;
      const url = `http://${displayHost}:${port}${this.graphqlIntegrationPath}`;
      results.graphql = { url };
      this.logger.info('GraphQL mounted within HTTP server', { url });
    }

    if (this.gatewayApp) {
      const gatewayListenOptions =
        typeof options.gateway === 'number' ? { port: options.gateway } : options.gateway;

      if (this.gatewayApp.isHttpIntegrated() && this.httpApp && results.http) {
        if (
          gatewayListenOptions?.path &&
          gatewayListenOptions.path !== this.gatewayApp.getHttpIntegrationPath()
        ) {
          this.logger.warn(
            'Gateway path override was ignored because the gateway is mounted within the HTTP server.',
          );
        }

        await this.gatewayApp.start(gatewayListenOptions?.subgraphs);
        results.gateway = {
          url: this.gatewayApp.getHttpIntegrationUrl(results.http),
        };
      } else {
        results.gateway = await this.gatewayApp.listen(options.gateway);
      }
    }

    this.logger.info('NaelPlatform application started');
    Boolean(results.http) && this.logger.info('HTTP server is running');
    Boolean(results.graphql) && this.logger.info('GraphQL server is running');
    Boolean(results.gateway) && this.logger.info('Federation gateway is running');

    return results;
  }

  async close(): Promise<void> {
    if (this.closed) {
      return;
    }

    const errors: Error[] = [];

    if (this.graphqlApp) {
      try {
        await this.graphqlApp.close();
      } catch (error) {
        errors.push(error instanceof Error ? error : new Error(String(error)));
      }
    }

    if (this.gatewayApp) {
      try {
        await this.gatewayApp.close();
      } catch (error) {
        errors.push(error instanceof Error ? error : new Error(String(error)));
      }
    }

    if (this.httpApp) {
      try {
        await this.httpApp.close();
      } catch (error) {
        errors.push(error instanceof Error ? error : new Error(String(error)));
      }
    }

    try {
      await this.context.close();
    } catch (error) {
      errors.push(error instanceof Error ? error : new Error(String(error)));
    }

    this.closed = true;
    this.logger.info('Nael application shutdown complete');

    if (errors.length) {
      const aggregate = new AggregateError(errors, 'One or more components failed to shut down');
      this.logger.error('Errors occurred during shutdown', aggregate);
      throw aggregate;
    }
  }

  async get<T>(token: Token<T>): Promise<T> {
    return this.context.get(token);
  }

  getConfig<TConfig extends Record<string, unknown>>(): ConfigService<TConfig> {
    return this.context.getConfig<TConfig>();
  }

  getLogger(): Logger {
    return this.logger;
  }
}

const normalizeHttpOptions = (value?: boolean | NaelFactoryHttpOptions): NormalizedHttpOptions => {
  if (typeof value === 'boolean') {
    return { enabled: value, options: {}, explicit: true };
  }

  if (!value) {
    return { enabled: true, options: {}, explicit: false };
  }

  const { enabled, ...rest } = value;
  return {
    enabled: enabled ?? true,
    options: rest,
    explicit: enabled !== undefined,
  };
};

const normalizeGraphqlOptions = (
  value?: boolean | NaelFactoryGraphqlOptions,
): NormalizedGraphqlOptions => {
  if (typeof value === 'boolean') {
    const path = normalizeGraphqlPath('/graphql');
    return {
      enabled: value,
      options: { path },
      explicit: true,
      path,
    };
  }

  if (!value) {
    const path = normalizeGraphqlPath('/graphql');
    return {
      enabled: false,
      options: { path },
      explicit: false,
      path,
    };
  }

  const { enabled, path, ...rest } = value;
  const normalizedPath = normalizeGraphqlPath(path ?? '/graphql');
  const options: GraphqlServerOptions = {
    ...rest,
    path: normalizedPath,
  };

  return {
    enabled: enabled ?? true,
    options,
    explicit: enabled !== undefined,
    path: normalizedPath,
  };
};

const normalizeGatewayOptions = (
  value?: boolean | NaelFactoryGatewayOptions,
): NormalizedGatewayOptions => {
  if (typeof value === 'boolean') {
    return { enabled: value, options: { path: '/graphql' }, explicit: true };
  }

  if (!value) {
    return { enabled: false, options: {}, explicit: false };
  }

  const { enabled, subgraphs, path, ...rest } = value;
  const options: FederationGatewayServerOptions = {
    ...rest,
  };

  if (subgraphs) {
    options.subgraphs = subgraphs;
  }

  options.path = path ? normalizeGatewayPath(path) : '/graphql';

  return {
    enabled: enabled ?? true,
    options,
    explicit: enabled !== undefined,
  };
};

export class NaelFactory {
  static async create(
    rootModule: ClassType,
    options: NaelFactoryOptions = {},
  ): Promise<NaelApplication> {
    const { http, graphql, gateway, ...appOptions } = options;
    const app = new Application();
    const context = await app.bootstrap(rootModule, appOptions);

    const normalizedHttp = normalizeHttpOptions(http);
    const normalizedGraphql = normalizeGraphqlOptions(graphql);
    const normalizedGateway = normalizeGatewayOptions(gateway);
    const logger = context.getLogger();
    const hasResolvers = context.getResolvers().length > 0;

    let graphqlEnabled = normalizedGraphql.enabled;
    if (!normalizedGraphql.explicit && hasResolvers) {
      graphqlEnabled = true;
    }

    if (graphqlEnabled && !hasResolvers) {
      logger.warn(
        'GraphQL was enabled but no resolvers were discovered; skipping GraphQL server startup.',
      );
      graphqlEnabled = false;
    }

    if (graphqlEnabled && !normalizedHttp.enabled) {
      throw new Error(
        'GraphQL support requires the HTTP server to be enabled. Enable HTTP or disable GraphQL.',
      );
    }

    const httpApp = normalizedHttp.enabled
      ? createHttpApplicationFromContext(context, normalizedHttp.options)
      : undefined;
    const graphqlApp = graphqlEnabled
      ? createGraphqlApplicationFromContext(context, normalizedGraphql.options)
      : undefined;
    const gatewayApp = normalizedGateway.enabled
      ? createFederationGatewayApplicationFromContext(context, normalizedGateway.options)
      : undefined;

    let graphqlIntegrationPath: string | undefined;

    if (httpApp && graphqlApp) {
      const mountPath = normalizedGraphql.path;
      const graphqlHandler = await graphqlApp.createHttpHandler(mountPath);
      const methods: HttpMethod[] = ['GET', 'POST', 'OPTIONS', 'HEAD'];
      for (const method of methods) {
        httpApp.registerRouteHandler(method, mountPath, graphqlHandler, { public: true });
      }
      graphqlIntegrationPath = mountPath;
      logger.info('Mounted GraphQL within HTTP server', { path: mountPath });
    }

    if (httpApp && gatewayApp) {
      gatewayApp.setHttpIntegration(normalizedGateway.options.path);
      const mountPath = gatewayApp.getHttpIntegrationPath();

      const gatewayHandler = async (ctx: RequestContext) => {
        const url = new URL(ctx.request.url);
        let body: unknown;

        if (ctx.request.method !== 'GET' && ctx.request.method !== 'HEAD') {
          if (ctx.body instanceof ArrayBuffer) {
            body = new Uint8Array(ctx.body);
          } else {
            body = ctx.body;
          }
        }

        return gatewayApp.execute({
          method: ctx.request.method,
          headers: ctx.headers,
          search: url.search,
          body,
        });
      };

      const gatewayMethods: HttpMethod[] = ['GET', 'POST', 'OPTIONS'];
      for (const method of gatewayMethods) {
        httpApp.registerRouteHandler(method, mountPath, gatewayHandler);
      }

      logger.info('Mounted federation gateway within HTTP server /graphql');
    }

    logger.info('NaelFactory created shared application context');

    return new NaelPlatformApplication(
      context,
      httpApp,
      graphqlApp,
      gatewayApp,
      graphqlIntegrationPath,
    );
  }
}
