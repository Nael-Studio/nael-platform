import type { Container, ResolveOptions } from './container/container';
import type { ClassType, Token } from './interfaces/provider';
import type { ContextId } from './scope';

export interface ModuleRefResolveOptions extends ResolveOptions {
  strict?: boolean;
}

export class ModuleRef {
  constructor(
    private readonly container: Container,
    private readonly moduleClass?: ClassType,
    private readonly defaultContextId?: ContextId,
  ) { }

  async resolve<T>(token: Token<T>, options: ModuleRefResolveOptions = {}): Promise<T> {
    this.assertStrictAccess(token, options.strict);
    const contextId = options.contextId ?? this.defaultContextId;
    return this.container.resolve(token, { contextId });
  }

  get<T>(token: Token<T>, options: ModuleRefResolveOptions = {}): T {
    this.assertStrictAccess(token, options.strict);
    const contextId = options.contextId ?? this.defaultContextId;
    const instance = this.container.peek(token, { contextId });
    if (instance === undefined) {
      const label = this.formatToken(token);
      throw new Error(
        `Provider for token "${label}" has not been instantiated. Use resolve() instead or ensure it is part of the bootstrap phase.`,
      );
    }
    return instance;
  }

  async create<T>(type: ClassType<T>, options: { contextId?: ContextId } = {}): Promise<T> {
    const contextId = options.contextId ?? this.defaultContextId;
    return this.container.create(type, { contextId });
  }

  private assertStrictAccess(token: Token, strict?: boolean): void {
    if (!strict) {
      return;
    }
    if (!this.moduleClass) {
      throw new Error('Strict resolution is only available for ModuleRef instances scoped to a module.');
    }
    if (!this.container.isTokenInModule(token, this.moduleClass)) {
      const target = this.formatToken(token);
      throw new Error(
        `Token "${target}" is not part of module ${this.moduleClass.name ?? 'AnonymousModule'}. Expose it or disable strict mode.`,
      );
    }
  }

  private formatToken(token: Token): string {
    if (typeof token === 'function') {
      return token.name || token.toString();
    }
    return String(token);
  }
}
