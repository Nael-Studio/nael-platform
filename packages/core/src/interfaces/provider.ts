export type ClassType<T = any> = new (...args: any[]) => T;

export type Token<T = any> = string | symbol | ClassType<T>;

export interface ClassProvider<T = any> {
  provide: Token<T>;
  useClass: ClassType<T>;
}

export interface ValueProvider<T = any> {
  provide: Token<T>;
  useValue: T;
}

export interface FactoryProvider<T = any> {
  provide: Token<T>;
  useFactory: (...args: any[]) => T | Promise<T>;
  inject?: Token[];
}

export type Provider<T = any> = ClassType<T> | ClassProvider<T> | ValueProvider<T> | FactoryProvider<T>;
