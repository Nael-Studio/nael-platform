import type { ClientSession } from 'mongodb';
import type { Logger } from '@nl-framework/logger';
import type { DocumentClass } from '../interfaces/document';

export type EntityWriteOperation =
  | 'insert'
  | 'update'
  | 'updateMany'
  | 'softDelete'
  | 'restore'
  | 'delete'
  | 'bulkWrite'
  | 'bulkUpsert';

/**
 * Emitted after a repository write succeeds. For single-document operations
 * `documents`/`ids` identify what was written; for many-ops (`updateMany`,
 * `delete`, ...) only `filter` and `count` are known — consumers that need the
 * affected documents should refetch or lean on an `updatedAt` reconcile sweep.
 */
export interface EntityWriteEvent<T = unknown> {
  connectionName: string;
  collection: string;
  target: DocumentClass;
  operation: EntityWriteOperation;
  documents?: T[];
  ids?: string[];
  filter?: unknown;
  count?: number;
  /** Present when the write ran inside a session — listeners can join the same transaction. */
  session?: ClientSession;
  timestamp: Date;
}

export type EntityWriteListener = (event: EntityWriteEvent) => void | Promise<void>;

export type EntityWriteEventInput = Omit<EntityWriteEvent, 'connectionName' | 'timestamp'>;

/**
 * Per-connection write-event bus. Repositories emit after each successful
 * write; listeners are awaited (so an outbox insert can share the write's
 * session/transaction) but a listener failure never fails the write — it is
 * logged and the remaining listeners still run.
 */
export class WriteNotifier {
  private readonly listeners = new Set<EntityWriteListener>();

  constructor(
    private readonly connectionName: string,
    private readonly logger?: Logger,
  ) {}

  get hasListeners(): boolean {
    return this.listeners.size > 0;
  }

  onWrite(listener: EntityWriteListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  async emit(event: EntityWriteEventInput): Promise<void> {
    if (!this.listeners.size) {
      return;
    }

    const fullEvent: EntityWriteEvent = {
      ...event,
      connectionName: this.connectionName,
      timestamp: new Date(),
    };

    for (const listener of this.listeners) {
      try {
        await listener(fullEvent);
      } catch (error) {
        const message = `Write listener failed for ${fullEvent.operation} on ${fullEvent.collection}`;
        if (this.logger) {
          this.logger.error(message, error);
        } else {
          console.error(message, error);
        }
      }
    }
  }
}
