import { afterEach, describe, expect, it } from 'bun:test';
import { Logger } from '../src/logger';
import { LoggerFactory } from '../src/logger-factory';
import { setLoggerContextProvider } from '../src/context';
import type { LoggerTransport, LogMessage } from '../src/types';

const collector = (): { entries: LogMessage[]; transport: LoggerTransport } => {
  const entries: LogMessage[] = [];
  return { entries, transport: { log: (e) => entries.push(e) } };
};

afterEach(() => setLoggerContextProvider(undefined));

describe('ambient logger context', () => {
  it('merges provider fields into meta, letting explicit meta win', () => {
    const { entries, transport } = collector();
    setLoggerContextProvider(() => ({ requestId: 'req-1' }));
    const logger = new Logger({ transports: [transport] });

    logger.info('hello');
    logger.info('override', { requestId: 'explicit' });

    expect(entries[0].meta).toEqual({ requestId: 'req-1' });
    expect(entries[1].meta).toEqual({ requestId: 'explicit' });
  });

  it('honors includeRequestContext:false', () => {
    const { entries, transport } = collector();
    setLoggerContextProvider(() => ({ requestId: 'req-1' }));
    const logger = new Logger({ transports: [transport], includeRequestContext: false });
    logger.info('hello');
    expect(entries[0].meta).toBeUndefined();
  });

  it('never throws when the provider blows up', () => {
    const { transport } = collector();
    setLoggerContextProvider(() => {
      throw new Error('boom');
    });
    const logger = new Logger({ transports: [transport] });
    expect(() => logger.info('safe')).not.toThrow();
  });
});

describe('LoggerFactory.addGlobalTransport', () => {
  it('retro-applies to already-created loggers and applies to future ones', () => {
    const { entries, transport } = collector();
    const factory = new LoggerFactory();
    const before = factory.create({ context: 'before' });

    factory.addGlobalTransport(transport);
    const after = factory.create({ context: 'after' });

    before.info('from-before');
    after.info('from-after');

    expect(entries.map((e) => e.message)).toEqual(['from-before', 'from-after']);
  });
});
