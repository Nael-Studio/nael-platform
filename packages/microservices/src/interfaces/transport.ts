export type MessagePattern = string | Record<string, unknown>;

export interface MessageContext {
  pattern: MessagePattern;
  data: unknown;
  metadata?: Record<string, string>;
}

export interface MessageHandler {
  (context: MessageContext): unknown | Promise<unknown>;
}

export interface MicroserviceSendOptions {
  /** Abort the invocation after this many milliseconds. Defaults to 30000. */
  timeout?: number;
  /** Override the target Dapr app id for this call. */
  appId?: string;
  /** Caller-supplied abort signal, combined with the timeout. */
  signal?: AbortSignal;
}

export interface Transport {
  connect(): Promise<void>;
  close(): Promise<void>;
  emit(pattern: MessagePattern, data: unknown): Promise<void>;
  send<TResult = unknown>(
    pattern: MessagePattern,
    data: unknown,
    options?: MicroserviceSendOptions,
  ): Promise<TResult>;
}
