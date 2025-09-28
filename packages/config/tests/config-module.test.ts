import { describe, expect, it, beforeEach, afterEach } from 'bun:test';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  Application,
  Injectable,
  Module,
  Inject,
  type ClassType,
} from '@nl-framework/core';
import {
  ConfigModule,
  ConfigService,
  getConfigFeatureToken,
  type ConfigModuleOptionsFactory,
} from '../dist/src/index.js';

type TestConfig = {
  app: {
    name: string;
    port: number;
  };
  features?: {
    flags?: string[];
  };
};

const createTempConfigDir = async (files: Record<string, string>): Promise<string> => {
  const dir = await mkdtemp(join(tmpdir(), 'config-module-'));
  await Promise.all(
    Object.entries(files).map(([filename, contents]) => writeFile(join(dir, filename), contents)),
  );
  return dir;
};

describe('ConfigModule', () => {
  let cleanupDirs: string[];

  const registerTempDir = (dir: string) => {
    cleanupDirs.push(dir);
  };

  const bootstrap = async (moduleClass: ClassType) => {
    const app = new Application();
    const context = await app.bootstrap(moduleClass);
    return { app, context };
  };

  beforeEach(() => {
    cleanupDirs = [];
  });

  afterEach(async () => {
    await Promise.all(
      cleanupDirs.map((dir) => rm(dir, { recursive: true, force: true })),
    );
  });

  it('loads configuration from a custom directory using forRoot', async () => {
    const dir = await createTempConfigDir({
      'default.yaml': `app:\n  name: test-app\n  port: 8080\n` ,
      'env.yaml': `app:\n  port: 9090\n` ,
    });
    registerTempDir(dir);

    @Module({
      imports: [ConfigModule.forRoot({ dir })],
    })
    class RootModule {}

    const { context } = await bootstrap(RootModule);
    const config = context.getConfig<TestConfig>();

  expect(config.get<string>('app.name')).toBe('test-app');
  expect(config.get<number>('app.port')).toBe(9090);

    await context.close();
  });

  it('exposes targeted configuration slices via forFeature', async () => {
    const dir = await createTempConfigDir({
      'default.yaml': `app:\n  name: feature\n  port: 3000\n` ,
      'env.yaml': `features:\n  flags:\n    - beta\n` ,
    });
    registerTempDir(dir);

    const featureToken = getConfigFeatureToken('features.flags');

    @Injectable()
    class FeatureConsumer {
      constructor(@Inject(featureToken) public readonly flags: string[] | undefined) {}
    }

    @Module({
      imports: [ConfigModule.forRoot({ dir }), ConfigModule.forFeature('features.flags')],
      providers: [FeatureConsumer],
    })
    class FeatureModule {}

    const { context } = await bootstrap(FeatureModule);
    const consumer = await context.get(FeatureConsumer);

    expect(Array.isArray(consumer.flags)).toBe(true);
    expect(consumer.flags).toEqual(['beta']);

    await context.close();
  });

  it('supports async configuration factories', async () => {
    const dir = await createTempConfigDir({
      'default.yaml': `app:\n  name: async-app\n  port: 4000\n` ,
    });
    registerTempDir(dir);

    @Injectable()
    class OptionsFactory implements ConfigModuleOptionsFactory {
      async createConfigOptions() {
        return {
          dir,
          overrides: {
            app: {
              port: 4100,
            },
          },
        };
      }
    }

    @Injectable()
    class ConfigConsumer {
      constructor(public readonly config: ConfigService<TestConfig>) {}

      getPort() {
        return this.config.get('app.port');
      }
    }

    @Module({
      imports: [
        ConfigModule.forRootAsync({
          imports: [],
          useClass: OptionsFactory,
        }),
      ],
  providers: [ConfigConsumer],
    })
    class AsyncModule {}

    const { context } = await bootstrap(AsyncModule);
    const consumer = await context.get(ConfigConsumer);

    expect(consumer.getPort()).toBe(4100);

    await context.close();
  });
});
