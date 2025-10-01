import { NaelFactory } from '@nl-framework/platform';
import { AppModule } from './app.module';

const PORT = Number(process.env.APP_PORT) || 3000;

async function bootstrap() {
  const factory = await NaelFactory.create(AppModule, {
    http: { port: PORT },
  });

  const app = factory.getHttpApplication();
  if (!app) {
    throw new Error('HTTP application not initialized');
  }

  await app.listen();
}

bootstrap().catch(console.error);
