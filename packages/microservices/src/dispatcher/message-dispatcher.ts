import { getCatchTypes, getUseFilters, getUsePipes, type ExceptionFilter, type PipeTransform } from '@nl-framework/core';
import type { ClassType } from '@nl-framework/core';
import type { MessagePattern } from '../interfaces/transport';
import { getMessagePatternMetadata } from '../decorators/patterns';
import { getGuards, type GuardToken, type CanActivate } from '../decorators/guards';

type HandlerEntry = {
  pattern: MessagePattern;
  isEvent: boolean;
  controller: any;
  methodName: string;
  filters: Array<ExceptionFilter | ClassType<ExceptionFilter>>;
  pipes: Array<PipeTransform | ClassType<PipeTransform>>;
  guards: GuardToken[];
};

export class MessageDispatcher {
  private handlers: HandlerEntry[] = [];

  registerController(controller: any) {
    const proto = Object.getPrototypeOf(controller);
    for (const property of Object.getOwnPropertyNames(proto)) {
      if (property === 'constructor') continue;
      const metadata = getMessagePatternMetadata(proto, property);
      if (!metadata) continue;
      const filters = this.collectFilters(proto, property);
      const pipes = this.collectPipes(proto, property);
      const guards = this.collectGuards(proto, property);
      this.handlers.push({
        pattern: metadata.pattern,
        isEvent: metadata.isEvent,
        controller,
        methodName: property,
        filters,
        pipes,
        guards,
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
      const result = await handler.controller[handler.methodName](transformed);
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

  private instantiate<T>(ref: T | ClassType<T>): T {
    if (typeof ref === 'function') {
      return new (ref as ClassType<T>)();
    }
    return ref;
  }

  private instantiateGuard(ref: GuardToken): CanActivate {
    if (typeof ref === 'function' && !(ref as any).canActivate) {
      return new (ref as ClassType<CanActivate>)();
    }
    return ref as CanActivate;
  }

  private matchPattern(left: MessagePattern, right: MessagePattern) {
    if (typeof left === 'string' && typeof right === 'string') return left === right;
    return JSON.stringify(left) === JSON.stringify(right);
  }
}
