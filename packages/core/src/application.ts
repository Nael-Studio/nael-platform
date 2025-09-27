import type { ClassType, Token } from './interfaces/provider';
import { Container } from './container/container';
import { ConfigLoader, type ConfigLoadOptions } from './config/config-loader';
import { ConfigService } from './config/config.service';
import { GLOBAL_PROVIDERS } from './constants';

export interface ApplicationOptions {
  config?: ConfigLoadOptions;
}

export class ApplicationContext {
  private readonly controllers = new Map<ClassType, unknown[]>();

  constructor(
    private readonly container: Container,
    controllers: Map<ClassType, unknown[]>,
    private readonly configService: ConfigService,
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

    return new ApplicationContext(this.container, controllersMap, configService);
  }

  async close(): Promise<void> {
    await this.container.close();
  }
}
