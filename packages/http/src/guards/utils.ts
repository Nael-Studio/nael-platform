import type { ClassType } from '@nl-framework/core';
import type { CanActivate, GuardFunction, GuardToken } from './types';

type GuardConstructor = ClassType<CanActivate> & {
  prototype: CanActivate;
  [GUARD_CLASS_MARKER]?: true;
};

type GuardCallable = GuardFunction & {
  [GUARD_FUNCTION_MARKER]?: true;
};

const GUARD_CLASS_MARKER = Symbol.for('nl:http:guards:class');
const GUARD_FUNCTION_MARKER = Symbol.for('nl:http:guards:function');

const defineMarker = <K extends symbol>(target: Function, marker: K): void => {
  if (Object.prototype.hasOwnProperty.call(target, marker)) {
    return;
  }

  Object.defineProperty(target, marker, {
    value: true,
    enumerable: false,
    configurable: false,
    writable: false,
  });
};

const hasCanActivatePrototype = (token: unknown): token is GuardConstructor =>
  typeof token === 'function' &&
  typeof (token as { prototype?: { canActivate?: unknown } }).prototype?.canActivate === 'function';

export const markGuardToken = (token: GuardToken): void => {
  if (hasCanActivatePrototype(token)) {
    defineMarker(token, GUARD_CLASS_MARKER);
    return;
  }

  if (typeof token === 'function') {
    defineMarker(token, GUARD_FUNCTION_MARKER);
  }
};

const hasClassMarker = (token: unknown): token is GuardConstructor =>
  typeof token === 'function' &&
  Boolean((token as GuardConstructor)[GUARD_CLASS_MARKER]);

const hasFunctionMarker = (token: unknown): token is GuardCallable =>
  typeof token === 'function' &&
  Boolean((token as GuardCallable)[GUARD_FUNCTION_MARKER]);

export const isGuardClassToken = (token: GuardToken): token is ClassType<CanActivate> => {
  if (hasClassMarker(token)) {
    return true;
  }

  if (hasFunctionMarker(token)) {
    return false;
  }

  return hasCanActivatePrototype(token);
};

export const isGuardFunctionToken = (token: GuardToken): token is GuardFunction => {
  if (hasFunctionMarker(token)) {
    return true;
  }

  if (hasClassMarker(token)) {
    return false;
  }

  return typeof token === 'function' && !hasCanActivatePrototype(token);
};
