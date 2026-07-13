import { describe, expect, it } from 'bun:test';
import type { ClientSession, Db } from 'mongodb';
import { LoggerFactory } from '@nl-framework/logger';
import type { Migration, MigrationRecord } from '../src/interfaces/migration';
import { MigrationRunner, migrationChecksum, type MigrationConnection } from '../src/migrations/migration-runner';

const loggerFactory = new LoggerFactory({ level: 'FATAL', transports: [{ log: () => {} }] });

/** In-memory stand-in for the `_nl_migrations` collection + a shared data store. */
const createConnection = (opts: { transactions?: boolean } = {}) => {
  const history: MigrationRecord[] = [];
  const data: string[] = []; // observable side effects performed by migrations
  const historyCollection = {
    find: () => ({ toArray: async () => history.map((r) => ({ ...r })) }),
    insertOne: async (record: MigrationRecord) => {
      history.push({ ...record });
      return { insertedId: record.name };
    },
    deleteOne: async (filter: { name: string }) => {
      const idx = history.findIndex((r) => r.name === filter.name);
      if (idx >= 0) history.splice(idx, 1);
      return { deletedCount: idx >= 0 ? 1 : 0 };
    },
  };
  const db = {
    collection: (name: string) => {
      if (name === '_nl_migrations') return historyCollection;
      throw new Error(`unexpected collection ${name}`);
    },
  } as unknown as Db;

  const connection: MigrationConnection = {
    ensureConnection: async () => {},
    getDatabase: () => db,
    withTransaction: async <T>(fn: (session: ClientSession) => Promise<T>): Promise<T> => {
      if (opts.transactions === false) {
        throw Object.assign(new Error('Transaction numbers are only allowed on a replica set member'), {
          code: 20,
        });
      }
      return fn({} as ClientSession);
    },
  };

  return { connection, history, data };
};

const makeMigration = (name: string, data: string[]): Migration => ({
  name,
  up: async () => {
    data.push(`up:${name}`);
  },
  down: async () => {
    data.push(`down:${name}`);
  },
});

describe('MigrationRunner', () => {
  it('applies pending migrations in order and is idempotent', async () => {
    const { connection, history, data } = createConnection();
    const migrations = [makeMigration('001-a', data), makeMigration('002-b', data)];
    const runner = new MigrationRunner(connection, migrations, loggerFactory);

    const first = await runner.up();
    expect(first).toEqual(['001-a', '002-b']);
    expect(data).toEqual(['up:001-a', 'up:002-b']);
    expect(history).toHaveLength(2);

    // Second up is a no-op.
    const second = await runner.up();
    expect(second).toEqual([]);
    expect(data).toEqual(['up:001-a', 'up:002-b']);
  });

  it('down reverses the last migration', async () => {
    const { connection, data } = createConnection();
    const migrations = [makeMigration('001-a', data), makeMigration('002-b', data)];
    const runner = new MigrationRunner(connection, migrations, loggerFactory);
    await runner.up();
    data.length = 0;

    const reverted = await runner.down();
    expect(reverted).toEqual(['002-b']);
    expect(data).toEqual(['down:002-b']);

    const status = await runner.status();
    expect(status.find((s) => s.name === '002-b')?.applied).toBe(false);
    expect(status.find((s) => s.name === '001-a')?.applied).toBe(true);
  });

  it('refuses to run when an applied migration checksum changed', async () => {
    const { connection, data } = createConnection();
    const original = makeMigration('001-a', data);
    const runner = new MigrationRunner(connection, [original], loggerFactory);
    await runner.up();

    // Same name, different body → different checksum.
    const edited: Migration = {
      name: '001-a',
      up: async () => {
        data.push('up:EDITED');
      },
      down: async () => {},
    };
    const runner2 = new MigrationRunner(connection, [edited], loggerFactory);
    await expect(runner2.up()).rejects.toThrow(/checksum changed/);
  });

  it('status reports applied/pending and checksum drift', async () => {
    const { connection, data } = createConnection();
    const migrations = [makeMigration('001-a', data), makeMigration('002-b', data)];
    const runner = new MigrationRunner(connection, migrations, loggerFactory);
    await runner.up();

    const status = await runner.status();
    expect(status.map((s) => s.applied)).toEqual([true, true]);
    expect(status.every((s) => !s.checksumChanged)).toBe(true);
  });

  it('falls back to running without a transaction on standalone topology', async () => {
    const { connection, data, history } = createConnection({ transactions: false });
    const runner = new MigrationRunner(connection, [makeMigration('001-a', data)], loggerFactory);
    const applied = await runner.up();
    expect(applied).toEqual(['001-a']);
    expect(data).toEqual(['up:001-a']);
    expect(history).toHaveLength(1);
  });

  it('migrationChecksum honours an explicit checksum', () => {
    const migration: Migration = { name: 'x', checksum: 'fixed', up: async () => {}, down: async () => {} };
    expect(migrationChecksum(migration)).toBe('fixed');
  });
});
