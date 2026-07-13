import { Logger } from './logger';
import type { LoggerOptions, LoggerTransport } from './types';

export class LoggerFactory {
  // Every logger this factory has minted, so a transport added later (e.g. the
  // devtools log-tail transport) can be retro-applied to loggers created during
  // bootstrap/module-init. Kept for the process lifetime — fine for a dev tool.
  private readonly created = new Set<Logger>();
  private readonly globalTransports: LoggerTransport[] = [];

  constructor(private readonly defaults: LoggerOptions = {}) {}

  create(options: LoggerOptions = {}): Logger {
    const logger = new Logger({
      ...this.defaults,
      ...options,
      transports: options.transports ?? this.defaults.transports,
    });
    for (const transport of this.globalTransports) {
      logger.addTransport(transport);
    }
    this.created.add(logger);
    return logger;
  }

  withContext(context: string): Logger {
    return this.create({ context });
  }

  /**
   * Attaches a transport to every logger this factory produces — including those
   * already created. Used to fan all application logs into a sink (e.g. the
   * devtools log tail) regardless of when each logger was minted.
   */
  addGlobalTransport(transport: LoggerTransport): void {
    this.globalTransports.push(transport);
    for (const logger of this.created) {
      logger.addTransport(transport);
    }
  }
}
