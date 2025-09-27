import { Logger } from './logger';
import type { LoggerOptions } from './types';

export class LoggerFactory {
  constructor(private readonly defaults: LoggerOptions = {}) {}

  create(options: LoggerOptions = {}): Logger {
    return new Logger({
      ...this.defaults,
      ...options,
      transports: options.transports ?? this.defaults.transports,
    });
  }

  withContext(context: string): Logger {
    return this.create({ context });
  }
}
