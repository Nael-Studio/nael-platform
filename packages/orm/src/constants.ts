import type { DocumentClass } from './interfaces';

export const DEFAULT_CONNECTION_NAME = 'default';

const prefix = '@nl-framework/orm';

const buildKey = (type: string, name?: string): string =>
  `${prefix}/${type}/${name ?? DEFAULT_CONNECTION_NAME}`;

export const getOptionsToken = (name?: string): symbol => Symbol.for(buildKey('options', name));
export const getConnectionToken = (name?: string): symbol => Symbol.for(buildKey('connection', name));
export const getDatabaseToken = (name?: string): symbol => Symbol.for(buildKey('database', name));
export const getSeedRegistryToken = (name?: string): symbol => Symbol.for(buildKey('seeds', name));
export const getSeedRunnerToken = (name?: string): symbol => Symbol.for(buildKey('seed-runner', name));
export const getDriverToken = (name?: string): symbol => Symbol.for(buildKey('driver', name));

export const getRepositoryToken = <T extends Record<string, unknown>>(
  document: DocumentClass<T>,
  name?: string,
): symbol =>
  Symbol.for(`${prefix}/repository/${name ?? DEFAULT_CONNECTION_NAME}/${document.name}`);

export const normalizeConnectionName = (name?: string): string => name ?? DEFAULT_CONNECTION_NAME;
