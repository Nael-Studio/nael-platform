import { getCatchTypes, getUseFilters, getUsePipes, type ExceptionFilter, type PipeTransform } from '@nl-framework/core';
import type { ClassType } from '@nl-framework/core';
import type { MessagePattern } from '../interfaces/transport';
import { getMessagePatternMetadata } from '../decorators/patterns';
import { getGuards, type GuardToken, type CanActivate } from '../decorators/guards';
import {
  getInterceptors,
  type InterceptorToken,
  type MicroserviceInterceptor,
  type CallHandler,
} from '../decorators/interceptors';

type HandlerEntry = {
  pattern: MessagePattern;
  isEvent: boolean;
  controller: any;
  methodName: string;
  filters: Array<ExceptionFilter | ClassType<ExceptionFilter>>;
  pipes: Array<PipeTransform | ClassType<PipeTransform>>;
  guards: GuardToken[];
  interceptors: InterceptorToken[];
};

type TokenResolver = <T>(token: ClassType<T>) => T | undefined;

export class MessageDispatcher {
  private handlers: HandlerEntry[] = [];

  constructor(private readonly resolveToken?: TokenResolver) {}

  registerController(controller: any) {
    const proto = Object.getPrototypeOf(controller);
    for (const property of Object.getOwnPropertyNames(proto)) {
      if (property === 'constructor') continue;
      const metadata = getMessagePatternMetadata(proto, property);
      if (!metadata) continue;
      const filters = this.collectFilters(proto, property);
      const pipes = this.collectPipes(proto, property);
      const guards = this.collectGuards(proto, property);
      const interceptors = this.collectInterceptors(proto, property);
      this.handlers.push({
        pattern: metadata.pattern,
        isEvent: metadata.isEvent,
        controller,
        methodName: property,
        filters,
        pipes,
        guards,
        interceptors,
      });
    }
  }

  async dispatch(pattern: MessagePattern, data: unknown): Promise<unknown> {
    const handler = this.handlers.find((h) => this.matchPattern(h.pattern, pattern));
    if (!handler) {
      throw new Error(`No handler found for pattern: ${JSON.stringify(pattern)}`);
    }

    try {
      await this.runGuards(handler.guards, pattern, data);
      const transformed = await this.applyPipes(handler.pipes, data);
      const executeHandler = async () => handler.controller[handler.methodName](transformed);
      const result = await this.applyInterceptors(handler.interceptors, { pattern, data }, executeHandler);
      return handler.isEvent ? undefined : result;
    } catch (err) {
      const caught = await this.handleError(handler.filters, err);
      if (caught !== undefined) return caught;
      throw err;
    }
  }

  private async runGuards(guards: GuardToken[], pattern: MessagePattern, data: unknown) {
    for (const guard of guards) {
      const instance = this.instantiateGuard(guard);
      const allowed = await instance.canActivate({ pattern, data });
      if (!allowed) {
        throw new Error('Guard denied execution');
      }
    }
  }

  private async applyPipes(pipes: HandlerEntry['pipes'], value: unknown) {
    let current = value;
    for (const pipe of pipes) {
      const instance = this.instantiate(pipe);
      current = await instance.transform(current);
    }
    return current;
  }

  private async handleError(filters: HandlerEntry['filters'], error: unknown) {
    for (const filter of filters) {
      const instance = this.instantiate(filter);
      const types = getCatchTypes(instance.constructor) ?? [];
      if (types.length === 0 || types.some((t) => error instanceof (t as any))) {
        return instance.catch(error);
      }
    }
    return undefined;
  }

  private collectFilters(proto: any, property: string): HandlerEntry['filters'] {
    const methodFilters = getUseFilters(proto, property) ?? [];
    const classFilters = getUseFilters(proto) ?? [];
    return [...classFilters, ...methodFilters];
  }

  private collectPipes(proto: any, property: string): HandlerEntry['pipes'] {
    const methodPipes = getUsePipes(proto, property) ?? [];
    const classPipes = getUsePipes(proto) ?? [];
    return [...classPipes, ...methodPipes];
  }

  private collectGuards(proto: any, property: string): GuardToken[] {
    const methodGuards = getGuards(proto, property) ?? [];
    const classGuards = getGuards(proto) ?? [];
    return [...classGuards, ...methodGuards];
  }

  private collectInterceptors(proto: any, property: string): InterceptorToken[] {
    const methodInterceptors = getInterceptors(proto, property) ?? [];
    const classInterceptors = getInterceptors(proto) ?? [];
    return [...classInterceptors, ...methodInterceptors];
  }

  private instantiate<T>(ref: T | ClassType<T>): T {
    if (typeof ref === 'function') {
      const resolved = this.resolveToken?.(ref as ClassType<T>);
      if (resolved) return resolved;
      return new (ref as ClassType<T>)();
    }
    return ref;
  }

  private instantiateGuard(ref: GuardToken): CanActivate {
    if (typeof ref === 'function') {
      const resolved = this.resolveToken?.(ref as ClassType<CanActivate>);
      if (resolved) return resolved;
      return new (ref as ClassType<CanActivate>)();
    }
    return ref as CanActivate;
  }

  private instantiateInterceptor(ref: InterceptorToken): MicroserviceInterceptor {
    if (typeof ref === 'function') {
      const resolved = this.resolveToken?.(ref as ClassType<MicroserviceInterceptor>);
      if (resolved) return resolved;
      return new (ref as ClassType<MicroserviceInterceptor>)();
    }
    return ref as MicroserviceInterceptor;
  }

  private async applyInterceptors(
    tokens: InterceptorToken[],
    context: { pattern: MessagePattern; data: unknown },
    handler: () => Promise<unknown>,
  ) {
    const chain = tokens
      .map((token) => this.instantiateInterceptor(token))
      .reverse()
      .reduce(
        (next, interceptor) => () => interceptor.intercept(context, { handle: next } as CallHandler),
        handler,
      );
    return chain();
  }

  private matchPattern(left: MessagePattern, right: MessagePattern) {
    if (typeof left === 'string' && typeof right === 'string') return left === right;
    return JSON.stringify(left) === JSON.stringify(right);
  }
}
