import type { ClassType, Token } from './interfaces/provider';
import { Container } from './container/container';
import { ConfigLoader, type ConfigLoadOptions } from './config/config-loader';
import { ConfigService } from './config/config.service';
import { GLOBAL_PROVIDERS } from './constants';
import { LoggerFactory } from '@nl-framework/logger';
import type { LoggerOptions } from '@nl-framework/logger';
import { Logger } from '@nl-framework/logger';

export interface ApplicationOptions {
  config?: ConfigLoadOptions;
  logger?: LoggerOptions;
}

export class ApplicationContext {
  private readonly controllers = new Map<ClassType, unknown[]>();

  constructor(
    private readonly container: Container,
    controllers: Map<ClassType, unknown[]>,
    private readonly configService: ConfigService,
    private readonly logger: Logger,
  ) {
    controllers.forEach((instances, moduleClass) => {
      this.controllers.set(moduleClass, instances);
    });
  }

  async get<T>(token: Token<T>): Promise<T> {
    return this.container.resolve(token);
  }

  getControllers<T = unknown>(module?: ClassType): T[] {
    if (module) {
      return (this.controllers.get(module) ?? []) as T[];
    }

    return Array.from(this.controllers.values()).flat() as T[];
  }

  getConfig<TConfig extends Record<string, unknown> = Record<string, unknown>>(): ConfigService<TConfig> {
    return this.configService as ConfigService<TConfig>;
  }

  getLogger(): Logger {
    return this.logger;
  }

  async close(): Promise<void> {
    await this.container.close();
  }
}

export class Application {
  private readonly container = new Container();

  async bootstrap(rootModule: ClassType, options: ApplicationOptions = {}): Promise<ApplicationContext> {
    const configObject = await ConfigLoader.load(options.config);
    const configService = new ConfigService(configObject);
    this.container.registerProvider({
      provide: GLOBAL_PROVIDERS.config,
      useValue: configService,
    });

    this.container.registerProvider({
      provide: ConfigService,
      useValue: configService,
    });

    this.container.registerProvider({
      provide: GLOBAL_PROVIDERS.appOptions,
      useValue: options,
    });

    const loggerFactory = new LoggerFactory(options.logger);
    const rootLogger = loggerFactory.create({ context: rootModule.name });

    this.container.registerProvider({
      provide: LoggerFactory,
      useValue: loggerFactory,
    });

    this.container.registerProvider({
      provide: Logger,
      useValue: rootLogger,
    });

    this.container.registerProvider({
      provide: GLOBAL_PROVIDERS.logger,
      useValue: rootLogger,
    });

    await this.container.registerModule(rootModule);

    const controllersMap = new Map<ClassType, unknown[]>();
    for (const moduleClass of this.container.getModules()) {
      const definition = this.container.getModuleDefinition(moduleClass);
      if (!definition) {
        continue;
      }
      const controllerInstances = await this.container.instantiateControllers(
        definition.controllers,
      );
      controllersMap.set(moduleClass, controllerInstances);
    }

    const moduleSummaries = Array.from(this.container.getModules()).map((moduleClass) => {
      const definition = this.container.getModuleDefinition(moduleClass);
      return {
        name: moduleClass.name ?? 'AnonymousModule',
        controllers: controllersMap.get(moduleClass)?.length ?? 0,
        providers: definition?.metadata.providers?.length ?? 0,
      };
    });

    rootLogger.info('Core application context initialized');

    return new ApplicationContext(this.container, controllersMap, configService, rootLogger);
  }

  async close(): Promise<void> {
    await this.container.close();
  }
}
