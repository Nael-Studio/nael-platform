import { describe, expect, it, spyOn } from 'bun:test';
import { Logger, LoggerFactory } from '../src/index';
import type { LogMessage, LoggerTransport } from '../src/types';
import { ConsoleTransport } from '../src/transports/console.transport';

const createCapture = (): { entries: LogMessage[]; transport: LoggerTransport } => {
  const entries: LogMessage[] = [];
  return { entries, transport: { log: (entry) => void entries.push(entry) } };
};

const FIXED = () => new Date('2020-01-01T00:00:00.000Z');

describe('Logger levels and message shape', () => {
  it('propagates error and meta into fatal/error entries', () => {
    const { entries, transport } = createCapture();
    const logger = new Logger({ level: 'DEBUG', transports: [transport], timestampFn: FIXED });

    const cause = new Error('boom');
    logger.error('request failed', cause, { requestId: 'r-1' });
    logger.fatal('process dying', cause, { pid: 42 });

    expect(entries).toHaveLength(2);
    expect(entries[0]).toEqual({
      level: 'ERROR',
      message: 'request failed',
      context: undefined,
      timestamp: FIXED(),
      meta: { requestId: 'r-1' },
      error: cause,
    });
    expect(entries[1]?.level).toBe('FATAL');
    expect(entries[1]?.error).toBe(cause);
    expect(entries[1]?.meta).toEqual({ pid: 42 });
  });

  it('filters by numeric severity — VERBOSE is dropped below the VERBOSE level', () => {
    const { entries, transport } = createCapture();
    const logger = new Logger({ level: 'INFO', transports: [transport] });

    logger.verbose('too chatty');
    logger.debug('also dropped');
    logger.info('kept');
    expect(entries.map((e) => e.message)).toEqual(['kept']);

    logger.setLevel('VERBOSE');
    expect(logger.getLevel()).toBe('VERBOSE');
    logger.verbose('now emitted');
    expect(entries.map((e) => e.message)).toEqual(['kept', 'now emitted']);
  });

  it('tracks context via setContext/getContext and stamps it on entries', () => {
    const { entries, transport } = createCapture();
    const logger = new Logger({ transports: [transport] });

    expect(logger.getContext()).toBeUndefined();
    logger.setContext('Orders');
    expect(logger.getContext()).toBe('Orders');
    logger.info('created');
    expect(entries[0]?.context).toBe('Orders');
  });
});

describe('Logger transports', () => {
  it('fans out to every transport, including ones added at runtime', () => {
    const first = createCapture();
    const second = createCapture();
    const logger = new Logger({ transports: [first.transport] });

    logger.info('one');
    logger.addTransport(second.transport);
    logger.info('two');

    expect(first.entries.map((e) => e.message)).toEqual(['one', 'two']);
    expect(second.entries.map((e) => e.message)).toEqual(['two']);
  });

  it('swallows rejections from an async transport without throwing', async () => {
    const consoleError = spyOn(console, 'error').mockImplementation(() => {});
    try {
      const logger = new Logger({
        transports: [{ log: () => Promise.reject(new Error('transport down')) }],
      });
      expect(() => logger.info('still fine')).not.toThrow();
      await Promise.resolve();
      await Promise.resolve();
    } finally {
      consoleError.mockRestore();
    }
  });
});

describe('Logger.child', () => {
  it('inherits transports and level but overrides context, and honors overrides', () => {
    const { entries, transport } = createCapture();
    const parent = new Logger({ level: 'WARN', transports: [transport] });

    const child = parent.child('Worker');
    child.warn('child warns');
    expect(entries[0]).toMatchObject({ level: 'WARN', context: 'Worker', message: 'child warns' });

    const verboseChild = parent.child('Chatter', { level: 'VERBOSE' });
    verboseChild.verbose('detailed');
    expect(entries.at(-1)).toMatchObject({ context: 'Chatter', message: 'detailed' });
  });
});

describe('LoggerFactory', () => {
  it('creates loggers from shared defaults and withContext', () => {
    const { entries, transport } = createCapture();
    const factory = new LoggerFactory({ level: 'DEBUG', transports: [transport] });

    const scoped = factory.withContext('Auth');
    scoped.debug('scoped debug');
    expect(entries[0]).toMatchObject({ level: 'DEBUG', context: 'Auth', message: 'scoped debug' });

    const custom = factory.create({ context: 'Billing' });
    custom.info('billing info');
    expect(entries.at(-1)?.context).toBe('Billing');
  });
});

describe('ConsoleTransport', () => {
  it('routes levels to the matching console method', () => {
    const log = spyOn(console, 'log').mockImplementation(() => {});
    const warn = spyOn(console, 'warn').mockImplementation(() => {});
    const error = spyOn(console, 'error').mockImplementation(() => {});
    try {
      const transport = new ConsoleTransport();
      const base = { timestamp: FIXED(), context: 'T' } as const;

      transport.log({ ...base, level: 'ERROR', message: 'e' });
      transport.log({ ...base, level: 'FATAL', message: 'f' });
      transport.log({ ...base, level: 'WARN', message: 'w' });
      transport.log({ ...base, level: 'INFO', message: 'i' });

      expect(error).toHaveBeenCalledTimes(2);
      expect(warn).toHaveBeenCalledTimes(1);
      expect(log).toHaveBeenCalledTimes(1);
    } finally {
      log.mockRestore();
      warn.mockRestore();
      error.mockRestore();
    }
  });

  it('formats entries through a custom formatter', () => {
    const log = spyOn(console, 'log').mockImplementation(() => {});
    try {
      const transport = new ConsoleTransport((entry) => `[[${entry.message}]]`);
      transport.log({ level: 'INFO', message: 'hello', timestamp: FIXED() });
      expect(log).toHaveBeenCalledWith('[[hello]]');
    } finally {
      log.mockRestore();
    }
  });
});
