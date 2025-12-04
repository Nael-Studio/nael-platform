import type {
  Provider,
  ClassType,
  Token,
  ClassProvider,
  ValueProvider,
  FactoryProvider,
} from '../interfaces/provider';
import { isForwardRef } from '../interfaces/provider';
import { getInjectableMetadata, isInjectable } from '../decorators/injectable';
import { getModuleMetadata } from '../decorators/module';
import { getParamInjectionTokens, ParameterInjectionMap } from '../decorators/inject';
import type { ModuleMetadata } from '../interfaces/module';
import type { Lifecycle } from '../lifecycle/hooks';
import { getMetadata } from '../utils/metadata';
import { ContextId, DEFAULT_CONTEXT_ID, Scope } from '../scope';
import { ModuleRef } from '../module-ref';

interface NormalizedClassProvider<T = any> {
  type: 'class';
  token: Token<T>;
  useClass: ClassType<T>;
  scope: Scope;
}

interface NormalizedValueProvider<T = any> {
  type: 'value';
  token: Token<T>;
  useValue: T;
  scope: Scope;
}

interface NormalizedFactoryProvider<T = any> {
  type: 'factory';
  token: Token<T>;
  useFactory: (...args: any[]) => T | Promise<T>;
  inject: Token[];
  scope: Scope;
}

type NormalizedProvider<T = any> =
  | NormalizedClassProvider<T>
  | NormalizedValueProvider<T>
  | NormalizedFactoryProvider<T>;

interface ModuleDefinition {
  metadata: Required<ModuleMetadata>;
  controllers: ClassType[];
  resolvers: ClassType[];
  bootstrap: Token[];
}

const MODULE_NOT_FOUND = (token: Token) =>
  new Error(`Provider for token "${typeof token === 'function' ? token.name : String(token)}" not found`);

export interface ResolveOptions {
  contextId?: ContextId;
}

export class Container {
  private readonly providerDefinitions = new Map<Token, NormalizedProvider>();
  private readonly providerInstances = new Map<Token, unknown>();
  private readonly providerPromises = new Map<Token, Promise<unknown>>();
  private readonly requestScopedInstances = new Map<Token, Map<ContextId, unknown>>();
  private readonly requestScopedPromises = new Map<Token, Map<ContextId, Promise<unknown>>>();
  private readonly namedProviderTokens = new Map<string, Token>();
  private readonly moduleRegistry = new Map<ClassType, ModuleDefinition>();
  private readonly providerToModule = new Map<Token, ClassType | undefined>();
  private readonly destroyCallbacks: Array<() => void | Promise<void>> = [];

  private getClassScope(target: ClassType | undefined): Scope {
    if (!target) {
      return Scope.SINGLETON;
    }
    return getInjectableMetadata(target)?.scope ?? Scope.SINGLETON;
  }

  private normalizeScope(input?: Scope, fallback?: ClassType): Scope {
    if (input) {
      return input;
    }
    return this.getClassScope(fallback);
  }

  async registerModule(moduleClass: ClassType): Promise<void> {
    if (this.moduleRegistry.has(moduleClass)) {
      return;
    }

    const metadata = getModuleMetadata(moduleClass);
    const definition: ModuleDefinition = {
      metadata,
      controllers: metadata.controllers ?? [],
      resolvers: metadata.resolvers ?? [],
      bootstrap: metadata.bootstrap ?? [],
    };

    this.moduleRegistry.set(moduleClass, definition);

    for (const imported of metadata.imports ?? []) {
      await this.registerModule(imported);
    }

    for (const provider of metadata.providers ?? []) {
      this.registerProvider(provider, moduleClass);
    }

    for (const controller of metadata.controllers ?? []) {
      this.registerProvider(controller, moduleClass);
    }

    for (const resolver of metadata.resolvers ?? []) {
      this.registerProvider(resolver, moduleClass);
    }

    // Auto-register exported providers if they are class references.
    for (const exported of metadata.exports ?? []) {
      if (!this.providerDefinitions.has(exported) && typeof exported === 'function') {
        this.registerProvider(exported as ClassType, moduleClass);
      }
    }
  }

  getModules(): ClassType[] {
    return Array.from(this.moduleRegistry.keys());
  }

  getModuleDefinition(moduleClass: ClassType): ModuleDefinition | undefined {
    return this.moduleRegistry.get(moduleClass);
  }

  registerProvider<T>(provider: Provider<T>, moduleClass?: ClassType): void {
    if (typeof provider === 'function') {
      const scope = this.getClassScope(provider);
      this.providerDefinitions.set(provider, {
        type: 'class',
        token: provider,
        useClass: provider,
        scope,
      });
      this.providerToModule.set(provider, moduleClass);
      if (provider.name) {
        this.namedProviderTokens.set(provider.name, provider);
      }
      return;
    }

    if ('useClass' in provider) {
      const scope = this.normalizeScope(provider.scope, provider.useClass);
      const normalized: NormalizedClassProvider = {
        type: 'class',
        token: provider.provide,
        useClass: provider.useClass,
        scope,
      };
      this.providerDefinitions.set(provider.provide, normalized);
      this.providerToModule.set(provider.provide, moduleClass);
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
        scope: Scope.SINGLETON,
      };
      this.providerDefinitions.set(provider.provide, normalized);
      this.providerInstances.set(provider.provide, provider.useValue);
      this.providerToModule.set(provider.provide, moduleClass);
      if (typeof provider.provide === 'function' && provider.provide.name) {
        this.namedProviderTokens.set(provider.provide.name, provider.provide);
      }
      return;
    }

    const factoryProvider = provider as FactoryProvider<T>;
    const scope = this.normalizeScope(factoryProvider.scope);
    const normalized: NormalizedFactoryProvider = {
      type: 'factory',
      token: factoryProvider.provide,
      useFactory: factoryProvider.useFactory,
      inject: factoryProvider.inject ?? [],
      scope,
    };
    this.providerDefinitions.set(factoryProvider.provide, normalized);
    this.providerToModule.set(factoryProvider.provide, moduleClass);
  }

  async resolve<T>(token: Token<T>, options: ResolveOptions = {}): Promise<T> {
    const contextId = options.contextId ?? DEFAULT_CONTEXT_ID;
    return this.internalResolve(token, [], contextId);
  }

  peek<T>(token: Token<T>, options: ResolveOptions = {}): T | undefined {
    const contextId = options.contextId ?? DEFAULT_CONTEXT_ID;
    const direct = this.getCachedInstanceForToken(token, contextId);
    if (direct !== undefined) {
      return direct as T;
    }
    const alias = this.findAliasToken(token);
    if (alias) {
      const instance = this.getCachedInstanceForToken(alias, contextId);
      if (instance !== undefined) {
        return instance as T;
      }
    }
    return undefined;
  }

  async create<T>(Cls: ClassType<T>, options: ResolveOptions = {}): Promise<T> {
    const contextId = options.contextId ?? DEFAULT_CONTEXT_ID;
    return this.instantiateClass(Cls, [], contextId);
  }

  isTokenInModule(token: Token, moduleClass?: ClassType): boolean {
    if (!moduleClass) {
      return true;
    }
    const owner = this.getOwnerModule(token);
    return owner === moduleClass;
  }

  releaseContext(contextId: ContextId): void {
    for (const [token, instances] of this.requestScopedInstances.entries()) {
      instances.delete(contextId);
      if (!instances.size) {
        this.requestScopedInstances.delete(token);
      }
    }

    for (const [token, promises] of this.requestScopedPromises.entries()) {
      promises.delete(contextId);
      if (!promises.size) {
        this.requestScopedPromises.delete(token);
      }
    }
  }

  private async internalResolve<T>(token: Token<T>, path: Token[], contextId: ContextId): Promise<T> {
    let lookupToken: Token = isForwardRef(token) ? token.forwardRef() : token;

    if (lookupToken === ModuleRef) {
      const ownerToken = path.length ? path[path.length - 1] : undefined;
      const moduleForOwner = ownerToken ? this.getOwnerModule(ownerToken) : undefined;
      return this.createModuleRef(moduleForOwner, contextId) as T;
    }

    const cachedInstance = this.getCachedInstanceForToken(lookupToken, contextId);
    if (cachedInstance !== undefined) {
      return cachedInstance as T;
    }

    const pending = this.getPendingPromiseForToken(lookupToken, contextId);
    if (pending) {
      return (await pending) as T;
    }

    if (path.includes(lookupToken)) {
      const chain = [...path, lookupToken]
        .map((t) => (typeof t === 'function' ? t.name : String(t)))
        .join(' -> ');
      throw new Error(`Circular dependency detected: ${chain}`);
    }

    let effectiveToken: Token = lookupToken;

    if (!this.providerDefinitions.has(effectiveToken)) {
      const alias = this.findAliasToken(lookupToken);
      if (alias && this.providerDefinitions.has(alias)) {
        effectiveToken = alias;
      }
    }

    if (!this.providerDefinitions.has(effectiveToken)) {
      if (typeof lookupToken === 'function' && isInjectable(lookupToken)) {
        this.registerProvider(lookupToken);
        if (lookupToken.name) {
          this.namedProviderTokens.set(lookupToken.name, lookupToken);
        }
      } else {
        throw MODULE_NOT_FOUND(lookupToken);
      }
    }

    const definition = this.providerDefinitions.get(effectiveToken);
    if (!definition) {
      throw MODULE_NOT_FOUND(lookupToken);
    }

    const scope = definition.scope ?? Scope.SINGLETON;
    this.ensureContextForScope(scope, effectiveToken, contextId);

    const scopedInstance = this.getCachedInstanceForToken(effectiveToken, contextId);
    if (scopedInstance !== undefined) {
      if (effectiveToken !== lookupToken) {
        this.cacheInstance(scope, lookupToken, contextId, scopedInstance);
      }
      return scopedInstance as T;
    }

    const existingPromise = this.getPendingPromise(scope, effectiveToken, contextId);
    if (existingPromise) {
      if (effectiveToken !== lookupToken) {
        this.setPendingPromise(scope, lookupToken, contextId, existingPromise);
      }
      return (await existingPromise) as T;
    }

    const creation = this.instantiateProvider(definition, [...path, effectiveToken], contextId).then((instance) => {
      if (scope !== Scope.TRANSIENT) {
        this.cacheInstance(scope, effectiveToken, contextId, instance);
        if (lookupToken !== effectiveToken) {
          this.cacheInstance(scope, lookupToken, contextId, instance);
        }
      }
      this.clearPendingPromise(scope, effectiveToken, contextId);
      if (lookupToken !== effectiveToken) {
        this.clearPendingPromise(scope, lookupToken, contextId);
      }
      return instance;
    });

    this.setPendingPromise(scope, effectiveToken, contextId, creation);
    if (lookupToken !== effectiveToken) {
      this.setPendingPromise(scope, lookupToken, contextId, creation);
    }

    return (await creation) as T;
  }

  private async instantiateProvider(
    definition: NormalizedProvider,
    path: Token[],
    contextId: ContextId,
  ): Promise<unknown> {
    switch (definition.type) {
      case 'value':
        return definition.useValue;
      case 'factory': {
        const dependencies = await Promise.all(
          definition.inject.map((t) => this.internalResolve(isForwardRef(t) ? t.forwardRef() : t, path, contextId)),
        );
        const instance = await definition.useFactory(...dependencies);
        this.handleLifecycle(instance);
        return instance;
      }
      case 'class': {
        const instance = await this.instantiateClass(definition.useClass, path, contextId);
        return instance;
      }
      default:
        throw new Error('Unsupported provider type');
    }
  }

  private async instantiateClass<T>(Cls: ClassType<T>, path: Token[], contextId: ContextId): Promise<T> {
    const paramTypes: ClassType[] =
      (getMetadata('design:paramtypes', Cls) as ClassType[]) ?? [];
    const injectTokens: ParameterInjectionMap = getParamInjectionTokens(Cls);

    const dependencies = await Promise.all(
      paramTypes.map(async (paramType, index) => {
        let token = (injectTokens.get(index) ?? paramType) as Token;
        if (!token) {
          throw new Error(`Cannot resolve dependency at index ${index} for ${Cls.name}`);
        }
        if (isForwardRef(token)) {
          token = token.forwardRef();
        }
        return this.internalResolve(token, path, contextId);
      }),
    );

    const instance = new Cls(...dependencies);
    await this.handleLifecycle(instance);
    return instance;
  }

  private findAliasToken(token: Token): Token | undefined {
    if (typeof token === 'function' && token.name) {
      return this.namedProviderTokens.get(token.name);
    }
    return undefined;
  }

  private getOwnerModule(token: Token): ClassType | undefined {
    if (this.providerToModule.has(token)) {
      return this.providerToModule.get(token);
    }
    const alias = this.findAliasToken(token);
    if (alias && this.providerToModule.has(alias)) {
      return this.providerToModule.get(alias);
    }
    return undefined;
  }

  private createModuleRef(moduleClass?: ClassType, contextId?: ContextId): ModuleRef {
    return new ModuleRef(this, moduleClass, contextId);
  }

  private getCachedInstanceForToken(token: Token, contextId: ContextId): unknown | undefined {
    if (this.providerInstances.has(token)) {
      return this.providerInstances.get(token);
    }
    return this.requestScopedInstances.get(token)?.get(contextId);
  }

  private getPendingPromiseForToken(token: Token, contextId: ContextId): Promise<unknown> | undefined {
    if (this.providerPromises.has(token)) {
      return this.providerPromises.get(token);
    }
    return this.requestScopedPromises.get(token)?.get(contextId);
  }

  private getPendingPromise(scope: Scope, token: Token, contextId: ContextId): Promise<unknown> | undefined {
    if (scope === Scope.SINGLETON) {
      return this.providerPromises.get(token);
    }
    if (scope === Scope.REQUEST) {
      return this.requestScopedPromises.get(token)?.get(contextId);
    }
    return undefined;
  }

  private setPendingPromise(scope: Scope, token: Token, contextId: ContextId, promise: Promise<unknown>): void {
    if (scope === Scope.SINGLETON) {
      this.providerPromises.set(token, promise);
      return;
    }
    if (scope === Scope.REQUEST) {
      this.getRequestPromiseMap(token).set(contextId, promise);
    }
  }

  private clearPendingPromise(scope: Scope, token: Token, contextId: ContextId): void {
    if (scope === Scope.SINGLETON) {
      this.providerPromises.delete(token);
      return;
    }
    if (scope === Scope.REQUEST) {
      const map = this.requestScopedPromises.get(token);
      if (!map) {
        return;
      }
      map.delete(contextId);
      if (!map.size) {
        this.requestScopedPromises.delete(token);
      }
    }
  }

  private cacheInstance(scope: Scope, token: Token, contextId: ContextId, instance: unknown): void {
    if (scope === Scope.SINGLETON) {
      this.providerInstances.set(token, instance);
      return;
    }
    if (scope === Scope.REQUEST) {
      this.getRequestInstanceMap(token).set(contextId, instance);
    }
  }

  private getRequestInstanceMap(token: Token): Map<ContextId, unknown> {
    if (!this.requestScopedInstances.has(token)) {
      this.requestScopedInstances.set(token, new Map());
    }
    return this.requestScopedInstances.get(token)!;
  }

  private getRequestPromiseMap(token: Token): Map<ContextId, Promise<unknown>> {
    if (!this.requestScopedPromises.has(token)) {
      this.requestScopedPromises.set(token, new Map());
    }
    return this.requestScopedPromises.get(token)!;
  }

  private ensureContextForScope(scope: Scope, token: Token, contextId: ContextId): void {
    if (scope !== Scope.REQUEST) {
      return;
    }

    if (contextId === DEFAULT_CONTEXT_ID) {
      const tokenLabel = this.formatToken(token);
      throw new Error(
        `Request-scoped provider "${tokenLabel}" cannot be resolved outside of an active request context. ` +
        'Call createContextId() to obtain a contextId, or use ModuleRef.create() within a request handler.',
      );
    }
  }

  private formatToken(token: Token): string {
    if (typeof token === 'function') {
      return token.name || token.toString();
    }
    return String(token);
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
