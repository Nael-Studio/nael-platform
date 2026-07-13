import { RequestContext } from '@nl-framework/core';
import type { LoggerTransport, LogMessage } from '@nl-framework/logger';
import type { DevtoolsBus } from './bus';

/**
 * Logger transport that mirrors every log entry into the instrumentation bus as a
 * `log` event, tagged with the ambient `requestId` when a request context is
 * active. Registered by the devtools module (via `Logger.addTransport`) only when
 * armed, so it adds no overhead in production.
 */
export class DevtoolsLoggerTransport implements LoggerTransport {
  constructor(private readonly bus: DevtoolsBus) {}

  log(entry: LogMessage): void {
    // Avoid an infinite loop: the bus never logs, but guard defensively anyway.
    this.bus.emit({
      type: 'log',
      requestId: RequestContext.id(),
      level: entry.level,
      context: entry.context,
      message: entry.message,
      at: entry.timestamp instanceof Date ? entry.timestamp.getTime() : Date.now(),
    });
  }
}
