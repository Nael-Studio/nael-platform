import type { ClassType, Token } from './interfaces/provider';
import { Container, type ResolveOptions } from './container/container';
import { ConfigLoader, type ConfigLoadOptions } from './config/config-loader';
import { ConfigService } from './config/config.service';
import { GLOBAL_PROVIDERS } from './constants';
import { LoggerFactory } from '@nl-framework/logger';
import type { LoggerOptions } from '@nl-framework/logger';
import { Logger } from '@nl-framework/logger';
import { createContextId, type ContextId } from './scope';
import { ModuleManager, type ModuleLoadListener, type ModuleLoadResult } from './module-manager';
import { LazyModuleLoader } from './lazy-module-loader';

export interface ApplicationOptions {
  config?: ConfigLoadOptions;
  logger?: LoggerOptions;
}

export class ApplicationContext {
  constructor(
    private readonly container: Container,
    private readonly modules: ModuleManager,
    private readonly configService: ConfigService,
    private readonly logger: Logger,
  ) { }

  async get<T>(token: Token<T>, options: ResolveOptions = {}): Promise<T> {
    return this.container.resolve(token, options);
  }

  peek<T>(token: Token<T>, options: ResolveOptions = {}): T | undefined {
    return this.container.peek(token, options);
  }

  async create<T>(type: ClassType<T>, options: ResolveOptions = {}): Promise<T> {
    return this.container.create(type, options);
  }

  createContextId(label?: string): ContextId {
    return createContextId(label);
  }

  releaseContext(contextId: ContextId): void {
    this.container.releaseContext(contextId);
  }

  getResolvers<T = unknown>(module?: ClassType): T[] {
    return this.modules.getResolvers(module);
  }

  getControllers<T = unknown>(module?: ClassType): T[] {
    return this.modules.getControllers(module);
  }

  async loadModule(moduleClass: ClassType): Promise<ModuleLoadResult> {
    return this.modules.loadModule(moduleClass);
  }

  addModuleLoadListener(listener: ModuleLoadListener): () => void {
    return this.modules.addLoadListener(listener);
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
  private readonly moduleManager = new ModuleManager(this.container);

  constructor() {
    this.container.registerProvider({
      provide: ModuleManager,
      useValue: this.moduleManager,
    });

    this.container.registerProvider(LazyModuleLoader);
  }

  async bootstrap(rootModule: ClassType, options: ApplicationOptions = {}): Promise<ApplicationContext> {
    this.container.registerProvider({
      provide: GLOBAL_PROVIDERS.config,
      useFactory: async () => new ConfigService(await ConfigLoader.load(options.config)),
    });

    this.container.registerProvider({
      provide: ConfigService,
      useFactory: (service: ConfigService) => service,
      inject: [GLOBAL_PROVIDERS.config],
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
    await this.moduleManager.hydrateRegisteredModules();

    const configService = await this.container.resolve(ConfigService);
    const moduleSummaries = Array.from(this.container.getModules()).map((moduleClass) => {
      const definition = this.container.getModuleDefinition(moduleClass);
      return {
        name: moduleClass.name ?? 'AnonymousModule',
        controllers: this.moduleManager.getControllers(moduleClass).length,
        resolvers: this.moduleManager.getResolvers(moduleClass).length,
        providers: definition?.metadata.providers?.length ?? 0,
        bootstrap: this.moduleManager.getBootstrapTokens(moduleClass).length,
      };
    });

    rootLogger.info('Core application context initialized');

    return new ApplicationContext(
      this.container,
      this.moduleManager,
      configService,
      rootLogger,
    );
  }

  async close(): Promise<void> {
    await this.container.close();
  }
}
