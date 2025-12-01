import type { Scope } from '../scope';

export type ClassType<T = any> = new (...args: any[]) => T;

/**
 * Forward reference wrapper to defer resolving a token until it is actually needed.
 * Useful for breaking import-time cycles when declaring injections.
 */
export interface ForwardRef<T = any> {
  forwardRef: () => Token<T>;
}

export const isForwardRef = (value: unknown): value is ForwardRef =>
  Boolean(value && typeof (value as ForwardRef).forwardRef === 'function');

export const forwardRef = <T = any>(fn: () => Token<T>): ForwardRef<T> => ({ forwardRef: fn });

export type Token<T = any> = string | symbol | ClassType<T> | ForwardRef<T>;

export interface ClassProvider<T = any> {
  provide: Token<T>;
  useClass: ClassType<T>;
  scope?: Scope;
}

export interface ValueProvider<T = any> {
  provide: Token<T>;
  useValue: T;
}

export interface FactoryProvider<T = any> {
  provide: Token<T>;
  useFactory: (...args: any[]) => T | Promise<T>;
  inject?: Token[];
  scope?: Scope;
}

export type Provider<T = any> = ClassType<T> | ClassProvider<T> | ValueProvider<T> | FactoryProvider<T>;
