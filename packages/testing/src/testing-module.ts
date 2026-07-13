import {
  Application,
  Module,
  type ApplicationContext,
  type ApplicationOptions,
  type ClassType,
  type ContextId,
  type Provider,
  type Token,
} from '@nl-framework/core';
import type { HttpServerOptions } from '@nl-framework/http';
import type { GraphqlServerOptions } from '@nl-framework/graphql';
import { HttpTestClient } from './http-test-client';
import { GraphqlTestClient } from './graphql-test-client';
import { InMemoryTransport, MicroserviceHarness } from './microservice-harness';

export interface TestingModuleMetadata {
  imports?: ClassType[];
  providers?: Provider[];
  controllers?: ClassType[];
  resolvers?: ClassType[];
  exports?: Token[];
  /** Tokens to eagerly instantiate on compile (e.g. lifecycle-bearing providers). */
  bootstrap?: Token[];
}

export interface OverrideFactoryOptions<T = unknown> {
  factory: (...args: any[]) => T | Promise<T>;
  inject?: Token[];
}

/**
 * Terminal step of an override chain: chooses the substitute for a token and
 * returns to the builder for further chaining.
 */
export class OverrideBuilder {
  constructor(
    private readonly token: Token,
    private readonly apply: (provider: Provider) => TestingModuleBuilder,
  ) {}

  useValue<T>(value: T): TestingModuleBuilder {
    return this.apply({ provide: this.token, useValue: value });
  }

  useClass<T>(useClass: ClassType<T>): TestingModuleBuilder {
    return this.apply({ provide: this.token, useClass });
  }

  useFactory<T>(options: OverrideFactoryOptions<T>): TestingModuleBuilder {
    return this.apply({
      provide: this.token,
      useFactory: options.factory,
      inject: options.inject ?? [],
    });
  }
}

const createTestingRootModule = (metadata: TestingModuleMetadata): ClassType => {
  @Module({
    imports: metadata.imports ?? [],
    providers: metadata.providers ?? [],
    controllers: metadata.controllers ?? [],
    resolvers: metadata.resolvers ?? [],
    exports: metadata.exports ?? [],
    bootstrap: metadata.bootstrap ?? [],
  })
  class TestingRootModule {}

  return TestingRootModule;
};

/**
 * Collects a module definition plus a set of provider/guard/interceptor/filter
 * overrides, then builds an {@link ApplicationContext} in which the overrides are
 * registered *before* any provider is instantiated — so dependents receive the
 * substitute, never the original.
 */
export class TestingModuleBuilder {
  private readonly overrides = new Map<Token, Provider>();

  constructor(private readonly metadata: TestingModuleMetadata) {}

  /** Replace a provider (by class or token) with a mock. */
  overrideProvider(token: Token): OverrideBuilder {
    return this.createOverride(token);
  }

  /** Replace a guard. Guards resolve through the container, so this is a token swap. */
  overrideGuard(token: Token): OverrideBuilder {
    return this.createOverride(token);
  }

  /** Replace an interceptor. */
  overrideInterceptor(token: Token): OverrideBuilder {
    return this.createOverride(token);
  }

  /** Replace an exception filter. */
  overrideFilter(token: Token): OverrideBuilder {
    return this.createOverride(token);
  }

  /** Replace a pipe. */
  overridePipe(token: Token): OverrideBuilder {
    return this.createOverride(token);
  }

  private createOverride(token: Token): OverrideBuilder {
    return new OverrideBuilder(token, (provider) => {
      this.overrides.set(token, provider);
      return this;
    });
  }

  /** Bootstrap the context and return a {@link TestingModule}. */
  async compile(options: ApplicationOptions = {}): Promise<TestingModule> {
    const rootModule = createTestingRootModule(this.metadata);
    const application = new Application();
    const context = await application.bootstrap(rootModule, options, {
      beforeHydrate: (container) => {
        for (const provider of this.overrides.values()) {
          container.registerProvider(provider);
        }
      },
    });

    return new TestingModule(context);
  }
}

export interface MicroserviceHarnessOptions {
  /**
   * Message-handler controllers to register. Accepts classes (resolved from the
   * container, honoring overrides) or ready instances. Defaults to the module's
   * discovered controllers.
   */
  controllers?: Array<ClassType | object>;
}

/**
 * An {@link ApplicationContext} facade with test conveniences. Resolve providers
 * with {@link get}, drive each transport with the `create*` helpers, and tear the
 * whole thing down (running shutdown lifecycle hooks) with {@link close}.
 */
export class TestingModule {
  constructor(private readonly context: ApplicationContext) {}

  get<T>(token: Token<T>, options?: { contextId?: ContextId }): Promise<T> {
    return this.context.get(token, options);
  }

  peek<T>(token: Token<T>, options?: { contextId?: ContextId }): T | undefined {
    return this.context.peek(token, options);
  }

  create<T>(type: ClassType<T>, options?: { contextId?: ContextId }): Promise<T> {
    return this.context.create(type, options);
  }

  createContextId(label?: string): ContextId {
    return this.context.createContextId(label);
  }

  releaseContext(contextId: ContextId): void {
    this.context.releaseContext(contextId);
  }

  getControllers<T = unknown>(module?: ClassType): T[] {
    return this.context.getControllers<T>(module);
  }

  getResolvers<T = unknown>(module?: ClassType): T[] {
    return this.context.getResolvers<T>(module);
  }

  getConfig<TConfig extends Record<string, unknown> = Record<string, unknown>>() {
    return this.context.getConfig<TConfig>();
  }

  getLogger() {
    return this.context.getLogger();
  }

  /** The wrapped context, for interop with framework helpers that expect one. */
  getContext(): ApplicationContext {
    return this.context;
  }

  /** Build an in-process HTTP test client (no port bound). */
  async createHttpApplication(options: HttpServerOptions = {}): Promise<HttpTestClient> {
    const { createHttpApplicationFromContext } = await import('@nl-framework/http');
    return new HttpTestClient(createHttpApplicationFromContext(this.context, options));
  }

  /** Build an in-process GraphQL executor. */
  async createGraphqlApplication(options: GraphqlServerOptions = {}): Promise<GraphqlTestClient> {
    const { createGraphqlApplicationFromContext } = await import('@nl-framework/graphql');
    return new GraphqlTestClient(createGraphqlApplicationFromContext(this.context, options));
  }

  /** Build an in-memory microservice harness that drives `MessageDispatcher`. */
  async createMicroserviceHarness(
    options: MicroserviceHarnessOptions = {},
  ): Promise<MicroserviceHarness> {
    const { MessageDispatcher } = await import('@nl-framework/microservices');

    const dispatcher = new MessageDispatcher({
      resolve: <T>(token: Token<T>) => this.context.get(token),
      logger: this.context.getLogger(),
    });

    const targets = options.controllers ?? this.context.getControllers<object>();
    for (const target of targets) {
      const instance =
        typeof target === 'function' ? await this.context.get(target as ClassType) : target;
      if (instance && typeof instance === 'object') {
        dispatcher.registerController(instance as object);
      }
    }

    return new MicroserviceHarness(new InMemoryTransport(dispatcher));
  }

  /** Run the shutdown lifecycle (onModuleDestroy) and release resources. */
  async close(): Promise<void> {
    await this.context.close();
  }
}

/**
 * Entry point mirroring `@nestjs/testing`'s `Test`.
 *
 * ```ts
 * const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
 *   .overrideProvider(UserService).useValue(mockUserService)
 *   .compile();
 * ```
 */
export const Test = {
  createTestingModule(metadata: TestingModuleMetadata): TestingModuleBuilder {
    return new TestingModuleBuilder(metadata);
  },
};
