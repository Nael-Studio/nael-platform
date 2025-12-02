import 'reflect-metadata';
import type { ClassType } from '@nl-framework/core';

export interface CanActivate {
  canActivate(context: { pattern: string | Record<string, unknown>; data: unknown }): boolean | Promise<boolean>;
}

export type GuardToken = CanActivate | ClassType<CanActivate>;

const GUARDS_METADATA = Symbol.for('nl:micro:guards');

export const UseGuards = (...guards: GuardToken[]): ClassDecorator & MethodDecorator =>
  (target: object, propertyKey?: string | symbol) => {
    if (propertyKey) {
      Reflect.defineMetadata(GUARDS_METADATA, guards, target, propertyKey);
    } else {
      Reflect.defineMetadata(GUARDS_METADATA, guards, target);
    }
  };

export function getGuards(target: object, propertyKey?: string | symbol): GuardToken[] | undefined {
  if (propertyKey) {
    return Reflect.getMetadata(GUARDS_METADATA, target, propertyKey) as GuardToken[] | undefined;
  }
  return Reflect.getMetadata(GUARDS_METADATA, target) as GuardToken[] | undefined;
}
