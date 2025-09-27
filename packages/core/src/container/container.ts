import type {
  Provider,
  ClassType,
  Token,
  ClassProvider,
  ValueProvider,
  FactoryProvider,
} from '../interfaces/provider';
import { isInjectable } from '../decorators/injectable';
import { getModuleMetadata } from '../decorators/module';
import { getParamInjectionTokens, ParameterInjectionMap } from '../decorators/inject';
import type { ModuleMetadata } from '../interfaces/module';
import type { Lifecycle } from '../lifecycle/hooks';
import { getMetadata } from '../utils/metadata';

interface NormalizedClassProvider<T = any> {
  type: 'class';
  token: Token<T>;
  useClass: ClassType<T>;
}

interface NormalizedValueProvider<T = any> {
  type: 'value';
  token: Token<T>;
  useValue: T;
}

interface NormalizedFactoryProvider<T = any> {
  type: 'factory';
  token: Token<T>;
  useFactory: (...args: any[]) => T | Promise<T>;
  inject: Token[];
}

type NormalizedProvider<T = any> =
  | NormalizedClassProvider<T>
  | NormalizedValueProvider<T>
  | NormalizedFactoryProvider<T>;

interface ModuleDefinition {
  metadata: Required<ModuleMetadata>;
  controllers: ClassType[];
  resolvers: ClassType[];
}

const MODULE_NOT_FOUND = (token: Token) =>
  new Error(`Provider for token "${typeof token === 'function' ? token.name : String(token)}" not found`);

export class Container {
  private readonly providerDefinitions = new Map<Token, NormalizedProvider>();
  private readonly providerInstances = new Map<Token, unknown>();
  private readonly providerPromises = new Map<Token, Promise<unknown>>();
  private readonly namedProviderTokens = new Map<string, Token>();
  private readonly moduleRegistry = new Map<ClassType, ModuleDefinition>();
  private readonly destroyCallbacks: Array<() => void | Promise<void>> = [];

  async registerModule(moduleClass: ClassType): Promise<void> {
    if (this.moduleRegistry.has(moduleClass)) {
      return;
    }

    const metadata = getModuleMetadata(moduleClass);
    const definition: ModuleDefinition = {
      metadata,
      controllers: metadata.controllers ?? [],
      resolvers: metadata.resolvers ?? [],
    };

    this.moduleRegistry.set(moduleClass, definition);

    for (const imported of metadata.imports ?? []) {
      await this.registerModule(imported);
    }

    for (const provider of metadata.providers ?? []) {
      this.registerProvider(provider);
    }

    for (const controller of metadata.controllers ?? []) {
      this.registerProvider(controller);
    }

    for (const resolver of metadata.resolvers ?? []) {
      this.registerProvider(resolver);
    }

    // Auto-register exported providers if they are class references.
    for (const exported of metadata.exports ?? []) {
      if (!this.providerDefinitions.has(exported) && typeof exported === 'function') {
        this.registerProvider(exported as ClassType);
      }
    }
  }

  getModules(): ClassType[] {
    return Array.from(this.moduleRegistry.keys());
  }

  getModuleDefinition(moduleClass: ClassType): ModuleDefinition | undefined {
    return this.moduleRegistry.get(moduleClass);
  }

  registerProvider<T>(provider: Provider<T>): void {
    if (typeof provider === 'function') {
      this.providerDefinitions.set(provider, {
        type: 'class',
        token: provider,
        useClass: provider,
      });
      if (provider.name) {
        this.namedProviderTokens.set(provider.name, provider);
      }
      return;
    }

    if ('useClass' in provider) {
      const normalized: NormalizedClassProvider = {
        type: 'class',
        token: provider.provide,
        useClass: provider.useClass,
      };
      this.providerDefinitions.set(provider.provide, normalized);
      if (typeof provider.provide === 'function' && provider.provide.name) {
        this.namedProviderTokens.set(provider.provide.name, provider.provide);
      }
      return;
    }

    if ('useValue' in provider) {
      const normalized: NormalizedValueProvider = {
        type: 'value',
        token: provider.provide,
        useValue: provider.useValue,
      };
      this.providerDefinitions.set(provider.provide, normalized);
      this.providerInstances.set(provider.provide, provider.useValue);
      if (typeof provider.provide === 'function' && provider.provide.name) {
        this.namedProviderTokens.set(provider.provide.name, provider.provide);
      }
      return;
    }

    const factoryProvider = provider as FactoryProvider<T>;
    const normalized: NormalizedFactoryProvider = {
      type: 'factory',
      token: factoryProvider.provide,
      useFactory: factoryProvider.useFactory,
      inject: factoryProvider.inject ?? [],
    };
    this.providerDefinitions.set(factoryProvider.provide, normalized);
  }

  async resolve<T>(token: Token<T>): Promise<T> {
    if (this.providerInstances.has(token)) {
      return this.providerInstances.get(token) as T;
    }

    if (this.providerPromises.has(token)) {
      return (await this.providerPromises.get(token)) as T;
    }

    let effectiveToken: Token = token;

    if (!this.providerDefinitions.has(token)) {
      if (typeof token === 'function' && token.name) {
        const alias = this.namedProviderTokens.get(token.name);
        if (alias && this.providerDefinitions.has(alias)) {
          effectiveToken = alias;
        }
      }
    }

    if (!this.providerDefinitions.has(effectiveToken)) {
      if (typeof token === 'function' && isInjectable(token)) {
        this.registerProvider(token);
        if (token.name) {
          this.namedProviderTokens.set(token.name, token);
        }
      } else {
        throw MODULE_NOT_FOUND(token);
      }
    }

    const definition = this.providerDefinitions.get(effectiveToken);
    if (!definition) {
      throw MODULE_NOT_FOUND(token);
    }

    const creation = this.instantiateProvider(definition).then((instance) => {
      this.providerInstances.set(effectiveToken, instance);
      if (typeof token !== typeof effectiveToken || token !== effectiveToken) {
        this.providerInstances.set(token, instance);
      }
      this.providerPromises.delete(effectiveToken);
      return instance;
    });

    this.providerPromises.set(effectiveToken, creation);
    return (await creation) as T;
  }

  private async instantiateProvider(definition: NormalizedProvider): Promise<unknown> {
    switch (definition.type) {
      case 'value':
        return definition.useValue;
      case 'factory': {
        const dependencies = await Promise.all(
          definition.inject.map((token) => this.resolve(token)),
        );
        const instance = await definition.useFactory(...dependencies);
        this.handleLifecycle(instance);
        return instance;
      }
      case 'class': {
        const instance = await this.instantiateClass(definition.useClass);
        return instance;
      }
      default:
        throw new Error('Unsupported provider type');
    }
  }

  private async instantiateClass<T>(Cls: ClassType<T>): Promise<T> {
    const paramTypes: ClassType[] =
      (getMetadata('design:paramtypes', Cls) as ClassType[]) ?? [];
    const injectTokens: ParameterInjectionMap = getParamInjectionTokens(Cls);

    const dependencies = await Promise.all(
      paramTypes.map(async (paramType, index) => {
        const token = injectTokens.get(index) ?? paramType;
        if (!token) {
          throw new Error(`Cannot resolve dependency at index ${index} for ${Cls.name}`);
        }
        return this.resolve(token);
      }),
    );

    const instance = new Cls(...dependencies);
    await this.handleLifecycle(instance);
    return instance;
  }

  private async handleLifecycle(instance: unknown): Promise<void> {
    if (!instance || typeof instance !== 'object') {
      return;
    }

    const lifecycle = instance as Lifecycle;

    if (typeof lifecycle.onModuleInit === 'function') {
      await lifecycle.onModuleInit();
    }

    if (typeof lifecycle.onModuleDestroy === 'function') {
      this.destroyCallbacks.push(() => lifecycle.onModuleDestroy!());
    }
  }

  async instantiateControllers(controllerClasses: ClassType[]): Promise<unknown[]> {
    return Promise.all(controllerClasses.map((controller) => this.resolve(controller)));
  }

  async close(): Promise<void> {
    await Promise.all(this.destroyCallbacks.map((cb) => cb()));
    this.destroyCallbacks.length = 0;
  }
}
