import { LogLevel, type LogLevelKey, LogLevelOrder } from './log-level';
import type { LoggerOptions, LoggerTransport, LogMessage } from './types';
import { ConsoleTransport } from './transports/console.transport';

const DEFAULT_LEVEL: LogLevelKey = 'INFO';

export class Logger {
  private readonly transports: LoggerTransport[];
  private readonly timestampFn: () => Date;
  private context?: string;
  private level: LogLevelKey;

  constructor(options: LoggerOptions = {}) {
    this.level = options.level ?? DEFAULT_LEVEL;
    this.context = options.context;
    this.transports = options.transports?.length ? options.transports : [new ConsoleTransport()];
    this.timestampFn = options.timestampFn ?? (() => new Date());
  }

  setContext(context?: string): void {
    this.context = context;
  }

  getContext(): string | undefined {
    return this.context;
  }

  setLevel(level: LogLevelKey): void {
    this.level = level;
  }

  getLevel(): LogLevelKey {
    return this.level;
  }

  fatal(message: string, error?: unknown, meta?: Record<string, unknown>): void {
    this.logMessage('FATAL', message, error, meta);
  }

  error(message: string, error?: unknown, meta?: Record<string, unknown>): void {
    this.logMessage('ERROR', message, error, meta);
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    this.logMessage('WARN', message, undefined, meta);
  }

  info(message: string, meta?: Record<string, unknown>): void {
    this.logMessage('INFO', message, undefined, meta);
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    this.logMessage('DEBUG', message, undefined, meta);
  }

  verbose(message: string, meta?: Record<string, unknown>): void {
    this.logMessage('VERBOSE', message, undefined, meta);
  }

  child(context: string, overrides: Partial<LoggerOptions> = {}): Logger {
    return new Logger({
      ...overrides,
      context,
      level: overrides.level ?? this.level,
      transports: overrides.transports ?? this.transports,
      timestampFn: overrides.timestampFn ?? this.timestampFn,
    });
  }

  addTransport(transport: LoggerTransport): void {
    this.transports.push(transport);
  }

  private logMessage(
    level: LogLevelKey,
    message: string,
    error?: unknown,
    meta?: Record<string, unknown>,
  ): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const entry: LogMessage = {
      level,
      message,
      context: this.context,
      timestamp: this.timestampFn(),
      meta,
      error,
    };

    for (const transport of this.transports) {
      const result = transport.log(entry);
      if (result instanceof Promise) {
        result.catch((transportError) => {
          // eslint-disable-next-line no-console
          console.error('Logger transport failed', transportError);
        });
      }
    }
  }

  private shouldLog(level: LogLevelKey): boolean {
    return LogLevel[level] <= LogLevel[this.level];
  }
}
