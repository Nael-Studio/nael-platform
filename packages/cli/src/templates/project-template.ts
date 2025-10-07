export interface ProjectTemplateContext {
  projectName: string;
  packageName: string;
  frameworkVersion: string;
  bunVersion: string;
}

export interface TemplateFile {
  path: string;
  contents: string;
  mode?: number;
}

const createPackageJson = (ctx: ProjectTemplateContext): string =>
  `${JSON.stringify(
    {
      name: ctx.packageName,
      version: '0.0.1',
      description: 'A Bun-native service generated with the Nael Framework CLI.',
      type: 'module',
      packageManager: `bun@${ctx.bunVersion}`,
      scripts: {
        dev: 'bun run --watch src/main.ts',
        start: 'bun run src/main.ts',
        build: 'bun build src/main.ts --target bun --outdir dist',
        minify: 'bun build src/main.ts --target bun --outdir dist --minify',
        check: 'bunx tsc --noEmit',
        test: 'bun test'
      },
      dependencies: {
        '@nl-framework/core': ctx.frameworkVersion,
        '@nl-framework/platform': ctx.frameworkVersion,
        '@nl-framework/http': ctx.frameworkVersion,
        '@nl-framework/logger': ctx.frameworkVersion,
        '@nl-framework/config': ctx.frameworkVersion,
        'reflect-metadata': '^0.1.13'
      },
      devDependencies: {
        'bun-types': `^${ctx.bunVersion}`,
        typescript: '^5.5.2'
      }
    },
    null,
    2
  )}\n`;

const tsconfigJson = `{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "forceConsistentCasingInFileNames": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "types": ["bun-types"],
    "outDir": "dist"
  },
  "include": ["src/**/*", "config/**/*"],
  "exclude": ["dist", "node_modules"]
}
`;

const gitignore = `node_modules
bun.lockb
dist
.env
.DS_Store
`;

const readme = (ctx: ProjectTemplateContext) => `# ${ctx.projectName}

This project was generated with the Nael Framework CLI and is ready to run on Bun.

## Quick start

\`\`\`bash
bun install
bun run src/main.ts
\`\`\`

Then visit <http://localhost:3000> to verify the service is healthy.

## Available scripts

- \`bun run --watch src/main.ts\`: Start the application in watch mode.
- \`bun run src/main.ts\`: Start the application once.
- \`bun run build\`: Produce compiled output in \`dist/\` targeting Bun.
- \`bun run minify\`: Emit a minified production build to \`dist/\`.
- \`bun run check\`: Type-check the project.
- \`bun test\`: Execute Bun tests as you add them.

## Next steps

- Add controllers, services, and providers under \`src/\`.
- Configure additional environment settings in \`config/default.yaml\`.
- Consult the Nael documentation via the MCP server for deeper guidance.
`;

const appConfig = `export interface AppConfig {
  server: {
    host: string;
    port: number;
  };
}
`;

const appController = `import { Controller, Get } from '@nl-framework/http';

@Controller()
export class AppController {
  @Get('/')
  health() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
`;

const appModule = `import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { Module } from '@nl-framework/core';
import { ConfigModule } from '@nl-framework/config';
import { AppController } from './app.controller';

const configDir = resolve(dirname(fileURLToPath(import.meta.url)), '../config');

@Module({
  imports: [
    ConfigModule.forRoot({
      dir: configDir,
    }),
  ],
  controllers: [AppController],
})
export class AppModule {}
`;

const mainTs = `import 'reflect-metadata';
import { NaelFactory } from '@nl-framework/platform';
import { Logger, LoggerFactory } from '@nl-framework/logger';
import { AppModule } from './app.module';
import type { AppConfig } from './app.config';

const bootstrap = async () => {
  const app = await NaelFactory.create(AppModule);

  const loggerFactory = await app.get<LoggerFactory>(LoggerFactory);
  const appLogger = loggerFactory.create({ context: 'Bootstrap' });

  const config = app.getConfig<AppConfig>();
  const host = config.get('server.host', '0.0.0.0');
  const port = config.get('server.port', 3000);

  await app.listen({ http: port });
  const displayHost = host === '0.0.0.0' ? 'localhost' : host;
  appLogger.info('Nael application ready', {
    url: \`http://\${displayHost}:\${port}\`,
  });

  const shutdown = async (signal: string) => {
    appLogger.warn('Received shutdown signal', { signal });
    await app.close();
    appLogger.info('Application stopped');
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
};

bootstrap().catch((error) => {
  const fallback = new Logger({ context: 'Bootstrap' });
  fallback.fatal('Failed to start application', error instanceof Error ? error : undefined);
  process.exit(1);
});
`;

const configDefaultYaml = `server:
  host: 0.0.0.0
  port: 3000
`;

export const createProjectTemplate = (ctx: ProjectTemplateContext): TemplateFile[] => [
  { path: 'package.json', contents: createPackageJson(ctx) },
  { path: 'tsconfig.json', contents: tsconfigJson },
  { path: '.gitignore', contents: gitignore },
  { path: 'README.md', contents: readme(ctx) },
  { path: 'config/default.yaml', contents: configDefaultYaml },
  { path: 'src/app.config.ts', contents: appConfig },
  { path: 'src/app.controller.ts', contents: appController },
  { path: 'src/app.module.ts', contents: appModule },
  { path: 'src/main.ts', contents: mainTs },
];
