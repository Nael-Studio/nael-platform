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
  options: HttpServerOptions;
  provided: boolean;
  deprecatedBoolean?: boolean;
  deprecatedEnabledFlag?: boolean;
  disableAttempted?: boolean;
}

interface NormalizedGraphqlOptions {
  options: GraphqlServerOptions;
  path: string;
  provided: boolean;
  deprecatedBoolean?: boolean;
  deprecatedEnabledFlag?: boolean;
  disableAttempted?: boolean;
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
  /** @deprecated HTTP is always enabled; remove this flag. */
  enabled?: boolean;
}

export interface NaelFactoryGraphqlOptions extends GraphqlServerOptions {
  /** @deprecated GraphQL availability is determined by resolver discovery; remove this flag. */
  enabled?: boolean;
}

export interface NaelFactoryGatewayOptions extends FederationGatewayServerOptions {
  enabled?: boolean;
}

export interface NaelFactoryOptions extends ApplicationOptions {
  /** @deprecated Boolean toggles are deprecated; HTTP is always enabled. Pass an options object instead. */
  http?: boolean | NaelFactoryHttpOptions;
  /** @deprecated Boolean toggles and the `enabled` flag are deprecated; GraphQL starts automatically when resolvers exist. */
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
  http?: ReturnType<typeof Bun.serve>;
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
      .then((factory: LoggerFactory) => {
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
    return {
      options: {},
      provided: true,
      deprecatedBoolean: true,
      disableAttempted: value === false,
    };
  }

  if (!value) {
    return { options: {}, provided: false };
  }

  const { enabled, ...rest } = value;
  return {
    options: rest,
    provided: true,
    deprecatedEnabledFlag: enabled !== undefined,
    disableAttempted: enabled === false,
  };
};

const normalizeGraphqlOptions = (
  value?: boolean | NaelFactoryGraphqlOptions,
): NormalizedGraphqlOptions => {
  if (typeof value === 'boolean') {
    const path = normalizeGraphqlPath('/graphql');
    return {
      options: { path },
      path,
      provided: true,
      deprecatedBoolean: true,
      disableAttempted: value === false,
    };
  }

  if (!value) {
    const path = normalizeGraphqlPath('/graphql');
    return {
      options: { path },
      path,
      provided: false,
    };
  }

  const { enabled, path, ...rest } = value;
  const normalizedPath = normalizeGraphqlPath(path ?? '/graphql');
  const options: GraphqlServerOptions = {
    ...rest,
    path: normalizedPath,
  };

  return {
    options,
    path: normalizedPath,
    provided: true,
    deprecatedEnabledFlag: enabled !== undefined,
    disableAttempted: enabled === false,
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

    if (normalizedHttp.deprecatedBoolean) {
      logger.warn(
        'Passing a boolean to `http` is deprecated. HTTP is always enabled; provide an options object instead.',
      );
    }

    if (normalizedHttp.deprecatedEnabledFlag) {
      logger.warn('The `enabled` flag in HTTP options is deprecated and ignored. HTTP cannot be disabled.');
    }

    if (normalizedHttp.disableAttempted) {
      logger.warn('HTTP server can no longer be disabled; ignoring the `false` flag.');
    }

    if (normalizedGraphql.deprecatedBoolean) {
      logger.warn(
        'Passing a boolean to `graphql` options is deprecated. GraphQL now starts automatically when resolvers are registered.',
      );
    }

    if (normalizedGraphql.deprecatedEnabledFlag) {
      logger.warn(
        'The `enabled` flag in GraphQL options is deprecated and ignored. GraphQL availability is determined by discovered resolvers.',
      );
    }

    if (normalizedGraphql.disableAttempted) {
      logger.warn(
        'GraphQL disable requests are no longer supported; availability is determined by registered resolvers.',
      );
    }

    const graphqlEnabled = hasResolvers;

    if (!graphqlEnabled && normalizedGraphql.provided) {
      logger.warn(
        'GraphQL configuration was provided but no resolvers were discovered; skipping GraphQL server startup.',
      );
    }

    const httpApp = createHttpApplicationFromContext(context, normalizedHttp.options);
    const graphqlApp = graphqlEnabled
      ? createGraphqlApplicationFromContext(context, normalizedGraphql.options)
      : undefined;
    const gatewayApp = normalizedGateway.enabled
      ? createFederationGatewayApplicationFromContext(context, normalizedGateway.options)
      : undefined;

    let graphqlIntegrationPath: string | undefined;

    if (graphqlApp) {
      const mountPath = normalizedGraphql.path;
      const graphqlHandler = await graphqlApp.createHttpHandler(mountPath);
      const methods: HttpMethod[] = ['GET', 'POST', 'OPTIONS', 'HEAD'];
      for (const method of methods) {
        httpApp.registerRouteHandler(method, mountPath, graphqlHandler, { public: true });
      }
      graphqlIntegrationPath = mountPath;
      logger.info('Mounted GraphQL within HTTP server', { path: mountPath });
    }

    if (gatewayApp) {
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
