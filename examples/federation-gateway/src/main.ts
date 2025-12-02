import { Logger, LoggerFactory } from '@nl-framework/logger';
import { NLFactory } from '@nl-framework/platform';
import type { FederationSubgraphDefinition } from '@nl-framework/graphql';
import { AppModule } from './app.module';

const resolvePort = (value: string | undefined, fallback: string, label: string): number => {
  const raw = value ?? fallback;
  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed)) {
    throw new Error(`Invalid ${label} value: ${raw}`);
  }
  return parsed;
};

const resolveHost = (): string => process.env.HOST ?? '0.0.0.0';
const resolvePortFromEnv = (): number => resolvePort(process.env.PORT, '4020', 'PORT');
const resolveGraphqlPath = (): string => process.env.GRAPHQL_PATH ?? '/graphql';

const resolveSubgraphs = (): FederationSubgraphDefinition[] => {
  const defaults: FederationSubgraphDefinition[] = [
    {
      name: 'products',
      url: process.env.PRODUCTS_SUBGRAPH_URL ?? 'http://localhost:4011/graphql',
    },
  ];

  if (!process.env.EXTRA_SUBGRAPHS) {
    return defaults;
  }

  try {
    const parsed = JSON.parse(process.env.EXTRA_SUBGRAPHS) as FederationSubgraphDefinition[];
    return [...defaults, ...parsed];
  } catch (error) {
    throw new Error(
      'Failed to parse EXTRA_SUBGRAPHS environment variable. Expected valid JSON array.',
    );
  }
};

const bootstrap = async (): Promise<void> => {
  const host = resolveHost();
  const port = resolvePortFromEnv();
  const graphqlPath = resolveGraphqlPath();
  const subgraphs = resolveSubgraphs();

  try {
    const app = await NLFactory.create(AppModule, {
      http: {
        host,
        port,
      },
      gateway: {
        path: graphqlPath,
        subgraphs,
      },
    });

    const loggerFactory = await app.get<LoggerFactory>(LoggerFactory);
    const appLogger = loggerFactory.create({ context: 'FederationGateway' });

    const { http, gateway } = await app.listen();

    const httpBoundPort = http?.port ?? port;
    const httpHostName = http?.hostname ?? host;
    const displayHost = httpHostName === '0.0.0.0' ? 'localhost' : httpHostName;
    const httpBaseUrl = `http://${displayHost}:${httpBoundPort}`;

    appLogger.info('HTTP greeting endpoint ready');

    const gatewayUrl = gateway?.url ?? `${httpBaseUrl}${graphqlPath === '/' ? '' : graphqlPath}`;
    appLogger.info('Apollo Federation gateway ready', {
      url: gatewayUrl,
      subgraphs: subgraphs.map((definition) => definition.url),
    });

    const shutdown = async (signal: string) => {
      appLogger.warn('Received shutdown signal', { signal });
      await app.close();
      appLogger.info('Federation gateway example stopped');
      process.exit(0);
    };

    process.on('SIGINT', () => void shutdown('SIGINT'));
    process.on('SIGTERM', () => void shutdown('SIGTERM'));
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    const fallback = new Logger({ context: 'FederationGateway' });
    fallback.fatal('Failed to start Apollo Federation gateway', err);
    process.exit(1);
  }
};

bootstrap();
