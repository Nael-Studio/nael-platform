import { Logger, LoggerFactory } from '@nl-framework/logger';
import { NaelFactory } from '@nl-framework/platform';
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

const resolveGatewayHost = (): string => process.env.HOST ?? '0.0.0.0';
const resolveGatewayPort = (): number => resolvePort(process.env.PORT, '4020', 'PORT');
const resolveHttpHost = (): string => process.env.HTTP_HOST ?? '0.0.0.0';
const resolveHttpPort = (): number => resolvePort(process.env.HTTP_PORT, '4021', 'HTTP_PORT');

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
  const httpHost = resolveHttpHost();
  const httpPort = resolveHttpPort();
  const gatewayHost = resolveGatewayHost();
  const gatewayPort = resolveGatewayPort();
  const subgraphs = resolveSubgraphs();

  try {
    const app = await NaelFactory.create(AppModule, {
      http: {
        host: httpHost,
        port: httpPort,
      },
      graphql: false,
      gateway: {
        host: gatewayHost,
        port: gatewayPort,
        subgraphs,
      },
    });

    const loggerFactory = await app.get<LoggerFactory>(LoggerFactory);
    const appLogger = loggerFactory.create({ context: 'FederationGateway' });

    const { http, gateway } = await app.listen();

    const httpBoundPort = http?.port ?? httpPort;
    const httpDisplayHost = httpHost === '0.0.0.0' ? 'localhost' : httpHost;
    const httpBaseUrl = `http://${httpDisplayHost}:${httpBoundPort}`;

    appLogger.info('HTTP greeting endpoint ready', {
      baseUrl: httpBaseUrl,
      greeting: `${httpBaseUrl}/greeting`,
    });

    const gatewayUrl = gateway?.url ?? `http://${gatewayHost}:${gatewayPort}`;
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
