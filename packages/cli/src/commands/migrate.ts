import { pathToFileURL } from 'node:url';
import { isAbsolute, resolve } from 'node:path';
import { CliError } from '../utils/cli-error';
import { fileExists } from '../utils/fs';

export type MigrateAction = 'up' | 'down' | 'status';

export interface MigrateOptions {
  action: MigrateAction;
  cwd?: string;
  /** Explicit config path; otherwise `nl-migrations.config.{ts,js,mjs}` is auto-detected. */
  configPath?: string;
  /** Number of migrations to revert on `down` (default 1). */
  steps?: number;
}

/** The minimal runner shape the command drives — `MigrationRunner` satisfies it. */
interface RunnerLike {
  up(): Promise<string[]>;
  down(steps?: number): Promise<string[]>;
  status(): Promise<Array<{ name: string; applied: boolean; appliedAt?: Date; checksumChanged: boolean }>>;
}

export interface MigrateResult {
  action: MigrateAction;
  applied?: string[];
  reverted?: string[];
  status?: Array<{ name: string; applied: boolean; checksumChanged: boolean }>;
}

const CONFIG_CANDIDATES = ['nl-migrations.config.ts', 'nl-migrations.config.js', 'nl-migrations.config.mjs'];

const resolveConfigPath = async (cwd: string, explicit?: string): Promise<string> => {
  if (explicit) {
    const abs = isAbsolute(explicit) ? explicit : resolve(cwd, explicit);
    if (!(await fileExists(abs))) {
      throw new CliError(`Migrations config not found at ${explicit}.`);
    }
    return abs;
  }
  for (const candidate of CONFIG_CANDIDATES) {
    const abs = resolve(cwd, candidate);
    if (await fileExists(abs)) {
      return abs;
    }
  }
  throw new CliError(
    `No migrations config found. Create one of ${CONFIG_CANDIDATES.join(', ')} that default-exports ` +
      'a function returning a configured MigrationRunner (e.g. from OrmModule / getMigrationRunnerToken).',
  );
};

const loadRunner = async (configPath: string): Promise<RunnerLike> => {
  const module = (await import(pathToFileURL(configPath).href)) as Record<string, unknown>;
  const candidate = module.default ?? module.createRunner ?? module.migrationRunner;
  const runner = typeof candidate === 'function' ? await (candidate as () => unknown)() : candidate;
  if (!runner || typeof (runner as RunnerLike).up !== 'function') {
    throw new CliError(
      `${configPath} must export a MigrationRunner (or a factory returning one) as its default export.`,
    );
  }
  return runner as RunnerLike;
};

export const runMigrateCommand = async (options: MigrateOptions): Promise<MigrateResult> => {
  const cwd = options.cwd ?? process.cwd();
  const configPath = await resolveConfigPath(cwd, options.configPath);
  const runner = await loadRunner(configPath);

  switch (options.action) {
    case 'up': {
      const applied = await runner.up();
      return { action: 'up', applied };
    }
    case 'down': {
      const reverted = await runner.down(options.steps ?? 1);
      return { action: 'down', reverted };
    }
    case 'status': {
      const status = await runner.status();
      return {
        action: 'status',
        status: status.map((s) => ({ name: s.name, applied: s.applied, checksumChanged: s.checksumChanged })),
      };
    }
    default:
      throw new CliError(`Unknown migrate action: ${options.action}. Use up, down, or status.`);
  }
};
