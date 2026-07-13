import type { LogLevelKey } from './log-level';

export interface LogMessage {
  level: LogLevelKey;
  message: string;
  context?: string;
  timestamp: Date;
  meta?: Record<string, unknown>;
  error?: unknown;
}

export interface LoggerTransport {
  log(entry: LogMessage): void | Promise<void>;
}

export interface LoggerOptions {
  level?: LogLevelKey;
  context?: string;
  transports?: LoggerTransport[];
  timestampFn?: () => Date;
  /**
   * When true (default), ambient request-context fields (e.g. `requestId`) from
   * the registered {@link LoggerContextProvider} are merged into each entry's
   * `meta`. Set false to opt a logger out.
   */
  includeRequestContext?: boolean;
}
