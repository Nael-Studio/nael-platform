import { createHash } from 'node:crypto';
import type { ClientSession, Collection, Db } from 'mongodb';
import { LoggerFactory, type Logger } from '@nl-framework/logger';
import type {
  Migration,
  MigrationContext,
  MigrationRecord,
  MigrationStatusEntry,
} from '../interfaces/migration';

export const MIGRATION_HISTORY_COLLECTION = '_nl_migrations';

/** The connection surface the runner needs; `MongoConnection` satisfies it. */
export interface MigrationConnection {
  ensureConnection(): Promise<void>;
  getDatabase(): Db;
  withTransaction<T>(fn: (session: ClientSession) => Promise<T>): Promise<T>;
}

export interface MigrationRunnerOptions {
  /** Override the history collection name (default `_nl_migrations`). */
  historyCollection?: string;
}

/** Compute a stable checksum for a migration from its explicit value or its source. */
export const migrationChecksum = (migration: Migration): string => {
  if (migration.checksum) {
    return migration.checksum;
  }
  const source = `${migration.up.toString()}\n${migration.down.toString()}`;
  return createHash('sha256').update(source).digest('hex');
};

const isTransactionUnsupported = (error: unknown): boolean => {
  const message = error instanceof Error ? error.message : String(error);
  const code = (error as { code?: number; codeName?: string })?.code;
  const codeName = (error as { codeName?: string })?.codeName;
  return (
    code === 20 ||
    codeName === 'IllegalOperation' ||
    /transaction numbers are only allowed on a replica set|transactions? are not supported|replica set|mongos/i.test(
      message,
    )
  );
};

/**
 * Applies and reverts {@link Migration}s in declared order, recording each in the
 * `_nl_migrations` history collection. Mirrors the seeding architecture. Each
 * migration runs in a transaction when the topology supports it; otherwise the
 * runner warns and runs without one.
 */
export class MigrationRunner {
  private readonly logger: Logger;
  private readonly historyName: string;

  constructor(
    private readonly connection: MigrationConnection,
    private readonly migrations: Migration[],
    loggerFactory: LoggerFactory,
    private readonly connectionName = 'default',
    options: MigrationRunnerOptions = {},
  ) {
    this.logger = loggerFactory.create({ context: `MigrationRunner(${connectionName})` });
    this.historyName = options.historyCollection ?? MIGRATION_HISTORY_COLLECTION;
  }

  /** Apply every pending migration in order. Returns the names applied. */
  async up(): Promise<string[]> {
    await this.connection.ensureConnection();
    const history = this.history();
    const applied = await this.loadApplied(history);

    // Refuse to run when an already-applied migration's checksum has changed.
    for (const migration of this.migrations) {
      const record = applied.get(migration.name);
      if (record && record.checksum !== migrationChecksum(migration)) {
        throw new Error(
          `Migration "${migration.name}" has already been applied but its checksum changed. ` +
            'Refusing to run. Revert the edit or create a new migration.',
        );
      }
    }

    const pending = this.migrations.filter((migration) => !applied.has(migration.name));
    if (!pending.length) {
      this.logger.info('No pending migrations', { connection: this.connectionName });
      return [];
    }

    const executed: string[] = [];
    for (const migration of pending) {
      const start = Date.now();
      await this.runReversible('up', migration);
      const durationMs = Date.now() - start;
      await history.insertOne({
        name: migration.name,
        appliedAt: new Date(),
        durationMs,
        checksum: migrationChecksum(migration),
      });
      this.logger.info('Applied migration', { name: migration.name, durationMs });
      executed.push(migration.name);
    }
    return executed;
  }

  /** Revert the last `steps` applied migrations, most-recent first. Returns the names reverted. */
  async down(steps = 1): Promise<string[]> {
    await this.connection.ensureConnection();
    const history = this.history();
    const applied = await this.loadApplied(history);

    // Reverse declaration order, keeping only applied migrations.
    const appliedInOrder = [...this.migrations].reverse().filter((migration) => applied.has(migration.name));
    const target = appliedInOrder.slice(0, Math.max(0, steps));
    if (!target.length) {
      this.logger.info('No applied migrations to revert', { connection: this.connectionName });
      return [];
    }

    const reverted: string[] = [];
    for (const migration of target) {
      await this.runReversible('down', migration);
      await history.deleteOne({ name: migration.name });
      this.logger.info('Reverted migration', { name: migration.name });
      reverted.push(migration.name);
    }
    return reverted;
  }

  /** Report each migration's applied state and whether its checksum drifted. */
  async status(): Promise<MigrationStatusEntry[]> {
    await this.connection.ensureConnection();
    const applied = await this.loadApplied(this.history());
    return this.migrations.map((migration) => {
      const record = applied.get(migration.name);
      return {
        name: migration.name,
        applied: Boolean(record),
        appliedAt: record?.appliedAt,
        checksumChanged: Boolean(record && record.checksum !== migrationChecksum(migration)),
      };
    });
  }

  private history(): Collection<MigrationRecord> {
    return this.connection.getDatabase().collection<MigrationRecord>(this.historyName);
  }

  private async loadApplied(
    history: Collection<MigrationRecord>,
  ): Promise<Map<string, MigrationRecord>> {
    const records = await history.find().toArray();
    return new Map(records.map((record) => [record.name, record]));
  }

  private async runReversible(direction: 'up' | 'down', migration: Migration): Promise<void> {
    const db = this.connection.getDatabase();
    const invoke = async (session?: ClientSession): Promise<void> => {
      const context: MigrationContext = { db, session, logger: this.logger };
      await migration[direction](context);
    };

    try {
      await this.connection.withTransaction(async (session) => {
        await invoke(session);
      });
    } catch (error) {
      if (isTransactionUnsupported(error)) {
        this.logger.warn(
          'Transactions are not supported on this topology; running migration without a transaction',
          { name: migration.name, direction },
        );
        await invoke(undefined);
        return;
      }
      throw error;
    }
  }
}
