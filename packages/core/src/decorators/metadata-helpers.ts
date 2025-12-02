export type Stage3MethodContext = {
  kind: 'method';
  name: string | symbol;
  static: boolean;
  addInitializer(initializer: (this: unknown) => void): void;
};

export type Stage3ClassContext = {
  kind: 'class';
  addInitializer(initializer: (this: unknown) => void): void;
};

export const isStage3MethodContext = (value: unknown): value is Stage3MethodContext =>
  typeof value === 'object' && value !== null && (value as Stage3MethodContext).kind === 'method';

export const isStage3ClassContext = (value: unknown): value is Stage3ClassContext =>
  typeof value === 'object' && value !== null && (value as Stage3ClassContext).kind === 'class';
