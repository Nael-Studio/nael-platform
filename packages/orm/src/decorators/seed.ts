import type { ClassType } from '@nl-framework/core';
import { normalizeConnectionName } from '../constants';

export interface SeedOptions {
  name?: string;
  connections?: string[];
  environments?: string[];
}

export interface SeedMetadata {
  id: string;
  name: string;
  target: ClassType;
  connections: string[];
  environments: string[] | null;
}

const seedRegistry = new Map<ClassType, SeedMetadata>();

const toKebabCase = (value: string): string =>
  value
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/\s+/g, '-')
    .toLowerCase();

const createSeedId = (name: string): string => toKebabCase(name);

export const Seed = (options: SeedOptions = {}): ClassDecorator => (target) => {
  const ctor = target as unknown as ClassType;
  const name = options.name ?? ctor.name;
  const connections = (options.connections ?? [undefined]).map((connection) =>
    normalizeConnectionName(connection),
  );
  const environments = options.environments?.map((env) => env.toLowerCase()) ?? null;

  const metadata: SeedMetadata = {
    id: createSeedId(name),
    name,
    target: ctor,
    connections,
    environments,
  };

  seedRegistry.set(ctor, metadata);
};

export const getSeedMetadata = (seed: ClassType): SeedMetadata => {
  const existing = seedRegistry.get(seed);
  if (existing) {
    return existing;
  }

  const name = seed.name || 'seed';
  const metadata: SeedMetadata = {
    id: createSeedId(name),
    name,
    target: seed,
    connections: [normalizeConnectionName(undefined)],
    environments: null,
  };

  seedRegistry.set(seed, metadata);
  return metadata;
};

export const getRegisteredSeeds = (): SeedMetadata[] => Array.from(seedRegistry.values());

export const clearSeedRegistry = (): void => {
  seedRegistry.clear();
};
