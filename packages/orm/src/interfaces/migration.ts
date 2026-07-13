import type { ClientSession, Db } from 'mongodb';
import type { Logger } from '@nl-framework/logger';

export interface MigrationContext {
  db: Db;
  /** Present when the migration runs inside a transaction (replica-set topology). */
  session?: ClientSession;
  logger: Logger;
}

/** A single, reversible schema/data migration. */
export interface Migration {
  name: string;
  up(context: MigrationContext): Promise<void>;
  down(context: MigrationContext): Promise<void>;
  /** Optional explicit checksum; when omitted it is derived from `up`/`down` source. */
  checksum?: string;
}

/** A row in the `_nl_migrations` history collection. */
export interface MigrationRecord {
  name: string;
  appliedAt: Date;
  durationMs: number;
  checksum: string;
}

export interface MigrationStatusEntry {
  name: string;
  applied: boolean;
  appliedAt?: Date;
  /** True when the file's checksum no longer matches the applied record. */
  checksumChanged: boolean;
}
