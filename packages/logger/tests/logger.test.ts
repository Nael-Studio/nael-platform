import { describe, expect, it } from 'bun:test';
import { Logger } from '../src/logger';
import type { LoggerTransport, LogMessage } from '../src/types';

describe('Logger', () => {
  it('logs messages above the configured level', () => {
    const entries: LogMessage[] = [];
    const transport: LoggerTransport = {
      log(entry) {
        entries.push(entry);
      },
    };

    const logger = new Logger({
      level: 'WARN',
      transports: [transport],
      timestampFn: () => new Date('2024-01-01T00:00:00.000Z'),
    });

    logger.debug('debug');
    logger.info('info');
    logger.warn('warn');
    logger.error('error');

    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({ level: 'WARN', message: 'warn' });
    expect(entries[1]).toMatchObject({ level: 'ERROR', message: 'error' });
  });

  it('supports child loggers with inherited transports', () => {
    const entries: LogMessage[] = [];
    const transport: LoggerTransport = {
      log(entry) {
        entries.push(entry);
      },
    };

    const logger = new Logger({
      transports: [transport],
      timestampFn: () => new Date('2024-01-01T00:00:00.000Z'),
    });

    const child = logger.child('Test');
    child.info('child message');

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ context: 'Test', message: 'child message', level: 'INFO' });
  });
});
