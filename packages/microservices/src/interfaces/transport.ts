export type MessagePattern = string | Record<string, unknown>;

export interface MessageContext {
  pattern: MessagePattern;
  data: unknown;
  metadata?: Record<string, string>;
}

export interface MessageHandler {
  (context: MessageContext): unknown | Promise<unknown>;
}

export interface Transport {
  connect(): Promise<void>;
  close(): Promise<void>;
  emit(pattern: MessagePattern, data: unknown): Promise<void>;
  send<TResult = unknown>(pattern: MessagePattern, data: unknown): Promise<TResult>;
}
