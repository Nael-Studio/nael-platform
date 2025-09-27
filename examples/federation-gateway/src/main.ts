import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { ApolloGateway, IntrospectAndCompose } from '@apollo/gateway';
import { Logger } from '@nl-framework/logger';

type SubgraphConfig = {
  name: string;
  url: string;
};

const resolvePort = (): number => {
  const value = process.env.PORT ?? '4020';
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    throw new Error(`Invalid PORT value: ${value}`);
  }
  return parsed;
};

const resolveHost = (): string => process.env.HOST ?? '0.0.0.0';

const resolveSubgraphs = (): SubgraphConfig[] => {
  const defaults: SubgraphConfig[] = [
    {
      name: 'products',
      url: process.env.PRODUCTS_SUBGRAPH_URL ?? 'http://localhost:4011/graphql',
    },
  ];

  if (!process.env.EXTRA_SUBGRAPHS) {
    return defaults;
  }

  try {
    const parsed = JSON.parse(process.env.EXTRA_SUBGRAPHS) as SubgraphConfig[];
    return [...defaults, ...parsed];
  } catch (error) {
    throw new Error('Failed to parse EXTRA_SUBGRAPHS environment variable. Expected valid JSON array.');
  }
};

const bootstrap = async (): Promise<void> => {
  const logger = new Logger({ context: 'FederationGateway' });
  const subgraphs = resolveSubgraphs();

  try {
    const gateway = new ApolloGateway({
      supergraphSdl: new IntrospectAndCompose({
        subgraphs,
      }),
    });

    const server = new ApolloServer({
      gateway,
    });

    const { url } = await startStandaloneServer(server, {
      listen: {
        host: resolveHost(),
        port: resolvePort(),
      },
    });

    logger.info('Apollo Federation gateway ready', {
      url,
      subgraphs: subgraphs.map((subgraph) => subgraph.url),
    });

    const shutdown = async (signal: string) => {
      logger.warn('Received shutdown signal', { signal });
      await server.stop();
      logger.info('Gateway stopped');
      process.exit(0);
    };

    process.on('SIGINT', () => void shutdown('SIGINT'));
    process.on('SIGTERM', () => void shutdown('SIGTERM'));
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.fatal('Failed to start Apollo Federation gateway', err);
    process.exit(1);
  }
};

bootstrap();
