import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { NaelFactory } from '@nl-framework/platform';
import { Logger, LoggerFactory } from '@nl-framework/logger';
import { getSeedRunnerToken, type SeedRunner } from '@nl-framework/orm';
import { AppModule } from './app.module';

const executeSeeds = async () => {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const configDir = resolve(currentDir, '../config');

  const app = await NaelFactory.create(AppModule, {
    config: { dir: configDir },
    http: false,
    graphql: false,
    gateway: false,
  });

  const loggerFactory = await app.get<LoggerFactory>(LoggerFactory);
  const logger = loggerFactory.create({ context: 'OrmSeedRunner' });

  const seedRunner = await app.get<SeedRunner>(getSeedRunnerToken());
  await seedRunner.run();

  logger.info('Seeds executed successfully');

  await app.close();
};

executeSeeds().catch((error) => {
  const fallback = new Logger({ context: 'OrmSeedRunner' });
  fallback.fatal('Failed to execute seeds', error instanceof Error ? error : undefined);
  process.exit(1);
});
