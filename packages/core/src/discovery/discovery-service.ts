import type { ClassType, Token } from '../interfaces/provider';
import type { Container } from '../container/container';
import type { ModuleManager } from '../module-manager';
import { getMetadata } from '../utils/metadata';
import { getParamInjectionTokens } from '../decorators/inject';

export interface DiscoveredProvider {
  token: Token;
  name: string;
  metatype?: ClassType;
  module?: ClassType;
  /** Resolved singleton instance if it has already been instantiated (providers are lazy). */
  instance?: unknown;
}

export interface DiscoveredMethod {
  metatype: ClassType;
  methodName: string;
  handler: (...args: unknown[]) => unknown;
}

export interface DiscoveredMethodWithMeta<T> extends DiscoveredMethod {
  meta: T;
}

export interface DiscoveredClassWithMeta<T> {
  metatype: ClassType;
  meta: T;
}

const tokenName = (token: Token): string =>
  typeof token === 'function' ? token.name : String(token);

/**
 * Runtime introspection over everything registered in the container: modules,
 * providers, controllers, and resolvers. Metadata scanning works on classes
 * (not instances), so it is safe to use before or during hydration — e.g. from
 * an `onModuleInit` hook that builds a catalog out of decorator metadata.
 */
export class DiscoveryService {
  constructor(
    private readonly container: Container,
    private readonly moduleManager: ModuleManager,
  ) {}

  getModules(): ClassType[] {
    return this.container.getModules();
  }

  /** Module classes this module imports (its `@Module({ imports })` edges). */
  getModuleImports(moduleClass: ClassType): ClassType[] {
    const definition = this.container.getModuleDefinition(moduleClass);
    return (definition?.metadata.imports ?? []).filter(
      (imported): imported is ClassType => typeof imported === 'function',
    );
  }

  /**
   * Constructor-injected dependency tokens of a class, in parameter order —
   * the `design:paramtypes` types with any `@Inject(token)` overrides applied.
   * The basis for a service→service dependency graph.
   */
  getConstructorDependencies(metatype: ClassType): Token[] {
    const paramTypes = (getMetadata('design:paramtypes', metatype) as Token[] | undefined) ?? [];
    const overrides = getParamInjectionTokens(metatype);
    return paramTypes.map((type, index) => overrides.get(index) ?? type);
  }

  /** Every registered provider (including controllers and resolvers, which are providers too). */
  getProviders(): DiscoveredProvider[] {
    return this.container.getProviderTokens().map((token) => ({
      token,
      name: tokenName(token),
      metatype: this.container.getProviderMetatype(token),
      module: this.container.getProviderModule(token),
      instance: this.container.peek(token),
    }));
  }

  /** Distinct provider classes (class + useClass providers, plus constructors of value providers). */
  getProviderClasses(): ClassType[] {
    const classes = new Set<ClassType>();
    for (const token of this.container.getProviderTokens()) {
      const metatype = this.container.getProviderMetatype(token);
      if (metatype) {
        classes.add(metatype);
      }
    }
    return Array.from(classes);
  }

  /** Controller classes as declared in module metadata — available before hydration. */
  getControllerClasses(module?: ClassType): ClassType[] {
    return this.collectFromDefinitions('controllers', module);
  }

  /** Resolver classes as declared in module metadata — available before hydration. */
  getResolverClasses(module?: ClassType): ClassType[] {
    return this.collectFromDefinitions('resolvers', module);
  }

  /** Instantiated controllers (empty for modules that have not been hydrated yet). */
  getControllers<T = unknown>(module?: ClassType): T[] {
    return this.moduleManager.getControllers<T>(module);
  }

  /** Instantiated resolvers (empty for modules that have not been hydrated yet). */
  getResolvers<T = unknown>(module?: ClassType): T[] {
    return this.moduleManager.getResolvers<T>(module);
  }

  /** Read class-level metadata (as written by `@SetMetadata` or `Reflect.defineMetadata`). */
  getClassMetadata<T = unknown>(key: unknown, metatype: ClassType): T | undefined {
    return getMetadata(key, metatype) as T | undefined;
  }

  /** All classes among the given targets that carry class-level metadata under `key`. */
  classesWithMetadata<T = unknown>(
    key: unknown,
    targets: ClassType[] = this.defaultScanTargets(),
  ): Array<DiscoveredClassWithMeta<T>> {
    const results: Array<DiscoveredClassWithMeta<T>> = [];
    for (const metatype of targets) {
      const meta = this.getClassMetadata<T>(key, metatype);
      if (meta !== undefined) {
        results.push({ metatype, meta });
      }
    }
    return results;
  }

  /**
   * All methods of `metatype` (own and inherited) that carry metadata under `key`.
   * Checks both `(prototype, methodName)` — where `@SetMetadata` writes in the
   * legacy decorator path — and the method function itself.
   */
  getMethodMetadata<T = unknown>(key: unknown, metatype: ClassType): Array<DiscoveredMethodWithMeta<T>> {
    const results: Array<DiscoveredMethodWithMeta<T>> = [];
    for (const { methodName, handler, owner } of this.collectMethods(metatype)) {
      const meta =
        (getMetadata(key, owner, methodName) as T | undefined) ??
        (getMetadata(key, handler) as T | undefined);
      if (meta !== undefined) {
        results.push({ metatype, methodName, handler, meta });
      }
    }
    return results;
  }

  /**
   * Scan method-level metadata across many classes at once. Defaults to every
   * controller, resolver, and provider class known to the container — the shape
   * needed for building catalogs out of decorators (e.g. collecting every
   * `@RequirePermission` in the app at startup).
   */
  methodsWithMetadata<T = unknown>(
    key: unknown,
    targets: ClassType[] = this.defaultScanTargets(),
  ): Array<DiscoveredMethodWithMeta<T>> {
    const results: Array<DiscoveredMethodWithMeta<T>> = [];
    for (const metatype of targets) {
      results.push(...this.getMethodMetadata<T>(key, metatype));
    }
    return results;
  }

  private defaultScanTargets(): ClassType[] {
    const targets = new Set<ClassType>([
      ...this.getControllerClasses(),
      ...this.getResolverClasses(),
      ...this.getProviderClasses(),
    ]);
    return Array.from(targets);
  }

  private collectFromDefinitions(kind: 'controllers' | 'resolvers', module?: ClassType): ClassType[] {
    const modules = module ? [module] : this.container.getModules();
    const classes = new Set<ClassType>();
    for (const moduleClass of modules) {
      const definition = this.container.getModuleDefinition(moduleClass);
      for (const cls of definition?.[kind] ?? []) {
        classes.add(cls);
      }
    }
    return Array.from(classes);
  }

  private collectMethods(metatype: ClassType): Array<{
    methodName: string;
    handler: (...args: unknown[]) => unknown;
    owner: object;
  }> {
    const methods: Array<{ methodName: string; handler: (...args: unknown[]) => unknown; owner: object }> = [];
    const seen = new Set<string>();
    let proto: object | null = metatype.prototype as object;
    while (proto && proto !== Object.prototype) {
      for (const methodName of Object.getOwnPropertyNames(proto)) {
        if (methodName === 'constructor' || seen.has(methodName)) {
          continue;
        }
        const descriptor = Object.getOwnPropertyDescriptor(proto, methodName);
        if (descriptor && typeof descriptor.value === 'function') {
          seen.add(methodName);
          methods.push({ methodName, handler: descriptor.value, owner: proto });
        }
      }
      proto = Object.getPrototypeOf(proto);
    }
    return methods;
  }
}
