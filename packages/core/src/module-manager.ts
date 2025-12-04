import type { ClassType, Token } from './interfaces/provider';
import type { Container } from './container/container';

export interface ModuleLoadResult {
  module: ClassType;
  controllers: unknown[];
  resolvers: unknown[];
  bootstrap: Token[];
}

export type ModuleLoadListener = (payload: ModuleLoadResult) => void | Promise<void>;

export class ModuleManager {
  private readonly controllers = new Map<ClassType, unknown[]>();
  private readonly resolvers = new Map<ClassType, unknown[]>();
  private readonly bootstrap = new Map<ClassType, Token[]>();
  private readonly listeners = new Set<ModuleLoadListener>();
  private readonly loading = new Map<ClassType, Promise<ModuleLoadResult>>();

  constructor(private readonly container: Container) { }

  addLoadListener(listener: ModuleLoadListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getControllers<T = unknown>(module?: ClassType): T[] {
    if (module) {
      return (this.controllers.get(module) ?? []) as T[];
    }
    return Array.from(this.controllers.values()).flat() as T[];
  }

  getResolvers<T = unknown>(module?: ClassType): T[] {
    if (module) {
      return (this.resolvers.get(module) ?? []) as T[];
    }
    return Array.from(this.resolvers.values()).flat() as T[];
  }

  getBootstrapTokens(module?: ClassType): Token[] {
    if (module) {
      return this.bootstrap.get(module) ?? [];
    }
    return Array.from(this.bootstrap.values()).flat();
  }

  async hydrateRegisteredModules(): Promise<ModuleLoadResult[]> {
    const newlyLoaded: ModuleLoadResult[] = [];
    for (const moduleClass of this.container.getModules()) {
      if (this.controllers.has(moduleClass)) {
        continue;
      }
      const result = await this.loadSingleModule(moduleClass);
      newlyLoaded.push(result);
    }
    return newlyLoaded;
  }

  async loadModule(moduleClass: ClassType): Promise<ModuleLoadResult> {
    await this.container.registerModule(moduleClass);
    const newlyLoaded = await this.hydrateRegisteredModules();
    for (const payload of newlyLoaded) {
      await this.notifyListeners(payload);
    }
    return this.composeResult(moduleClass);
  }

  private async loadSingleModule(moduleClass: ClassType): Promise<ModuleLoadResult> {
    if (!this.loading.has(moduleClass)) {
      this.loading.set(
        moduleClass,
        this.instantiateModule(moduleClass)
          .then((result) => {
            this.storeResult(result);
            this.loading.delete(moduleClass);
            return result;
          })
          .catch((error) => {
            this.loading.delete(moduleClass);
            throw error;
          }),
      );
    }

    return this.loading.get(moduleClass)!;
  }

  private composeResult(moduleClass: ClassType): ModuleLoadResult {
    return {
      module: moduleClass,
      controllers: this.controllers.get(moduleClass) ?? [],
      resolvers: this.resolvers.get(moduleClass) ?? [],
      bootstrap: this.bootstrap.get(moduleClass) ?? [],
    } satisfies ModuleLoadResult;
  }

  private async instantiateModule(moduleClass: ClassType): Promise<ModuleLoadResult> {
    const definition = this.container.getModuleDefinition(moduleClass);
    if (!definition) {
      throw new Error(`Module ${moduleClass.name ?? 'AnonymousModule'} is not registered in the container.`);
    }

    const controllers = await this.container.instantiateControllers(definition.controllers);
    const resolvers = await Promise.all(definition.resolvers.map((resolver) => this.container.resolve(resolver)));
    const bootstrapTokens = definition.bootstrap ?? [];
    const instantiated: Token[] = [];

    for (const token of new Set<Token>(bootstrapTokens)) {
      await this.container.resolve(token);
      instantiated.push(token);
    }

    return {
      module: moduleClass,
      controllers,
      resolvers,
      bootstrap: instantiated,
    } satisfies ModuleLoadResult;
  }

  private storeResult(result: ModuleLoadResult): void {
    this.controllers.set(result.module, result.controllers);
    this.resolvers.set(result.module, result.resolvers);
    this.bootstrap.set(result.module, result.bootstrap);
  }

  private async notifyListeners(result: ModuleLoadResult): Promise<void> {
    for (const listener of this.listeners) {
      await listener(result);
    }
  }
}
