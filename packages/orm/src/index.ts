export * from './interfaces';
export * from './decorators/document';
export * from './decorators/prop';
export * from './decorators/hooks';
export * from './decorators/relations';
export * from './decorators/version';
export * from './decorators/inject-repository';
export * from './decorators/seed';
export * from './module';
export * from './repository/mongo-repository';
export * from './exceptions/entity-not-found.exception';
export * from './exceptions/optimistic-lock.exception';
export * from './seeding/seed-runner';
export * from './migrations/migration-runner';
export type {
	Migration,
	MigrationContext,
	MigrationRecord,
	MigrationStatusEntry,
} from './interfaces/migration';
export * from './connection/mongo-connection';
export * from './drivers/mongo-driver';
export * from './events/write-notifier';
export {
  registerQueryObserver,
  clearQueryObservers,
  hasQueryObservers,
  notifyQueryObservers,
  describeFilterShape,
  type QueryObserver,
  type OrmQueryObservation,
} from './observability/query-observer';
export {
	DEFAULT_CONNECTION_NAME,
	getConnectionToken,
	getDatabaseToken,
	getOptionsToken,
	getRepositoryToken,
	getSeedRegistryToken,
	getSeedRunnerToken,
	getSeedHistoryToken,
	getMigrationRunnerToken,
	getDriverToken,
	getWriteNotifierToken,
	normalizeConnectionName,
} from './constants';
export { ObjectId } from 'mongodb';
export type {
	AnyBulkWriteOperation,
	BulkWriteResult,
	ClientSession,
	ClientSessionOptions,
	CreateIndexesOptions,
	IndexSpecification,
	TransactionOptions,
} from 'mongodb';
