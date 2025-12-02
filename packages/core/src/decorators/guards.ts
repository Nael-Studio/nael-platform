import 'reflect-metadata';
import type { ClassType } from '../interfaces/provider';

export type GuardContext = {
  request?: unknown;
  response?: unknown;
  args?: unknown[];
  pattern?: unknown;
  data?: unknown;
};

export interface CanActivate {
  canActivate(context: GuardContext): boolean | Promise<boolean>;
}

export type GuardToken = CanActivate | ClassType<CanActivate>;

const GUARDS_METADATA = Symbol.for('nl:core:guards');

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
