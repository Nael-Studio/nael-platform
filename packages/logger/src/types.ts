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
}
