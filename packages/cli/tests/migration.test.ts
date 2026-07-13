import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { mkdtemp, rm, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runGenerateMigrationCommand } from '../src/commands/generate-migration';
import { runMigrateCommand } from '../src/commands/migrate';

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'nl-migrate-'));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe('nl g migration', () => {
  it('scaffolds a timestamped migration file and updates the index', async () => {
    const result = await runGenerateMigrationCommand({
      name: 'add users index',
      cwd: dir,
      timestamp: '20260712000000',
    });

    const expected = join('src/migrations', '20260712000000-add-users-index.migration.ts');
    expect(result.createdFiles).toContain(expected);

    const contents = await readFile(join(dir, expected), 'utf8');
    expect(contents).toContain('export const AddUsersIndexMigration: Migration');
    expect(contents).toContain("name: '20260712000000_add-users-index'");

    const index = await readFile(join(dir, 'src/migrations/index.ts'), 'utf8');
    expect(index).toContain("export * from './20260712000000-add-users-index.migration';");
  });

  it('refuses to overwrite without --force', async () => {
    const opts = { name: 'dup', cwd: dir, timestamp: '20260101000000' };
    await runGenerateMigrationCommand(opts);
    await expect(runGenerateMigrationCommand(opts)).rejects.toThrow(/already exists/);
    await expect(runGenerateMigrationCommand({ ...opts, force: true })).resolves.toBeDefined();
  });
});

describe('nl migrate', () => {
  const writeConfig = async (body: string): Promise<string> => {
    const path = join(dir, 'nl-migrations.config.mjs');
    await writeFile(path, body, 'utf8');
    return path;
  };

  it('drives up/down/status on the runner exported by the config', async () => {
    await writeConfig(`
      const runner = {
        up: async () => ['001-a', '002-b'],
        down: async (steps = 1) => ['002-b'].slice(0, steps),
        status: async () => [
          { name: '001-a', applied: true, checksumChanged: false },
          { name: '002-b', applied: false, checksumChanged: false },
        ],
      };
      export default () => runner;
    `);

    const up = await runMigrateCommand({ action: 'up', cwd: dir });
    expect(up.applied).toEqual(['001-a', '002-b']);

    const down = await runMigrateCommand({ action: 'down', cwd: dir });
    expect(down.reverted).toEqual(['002-b']);

    const status = await runMigrateCommand({ action: 'status', cwd: dir });
    expect(status.status?.map((s) => s.applied)).toEqual([true, false]);
  });

  it('errors clearly when no config is present', async () => {
    await expect(runMigrateCommand({ action: 'up', cwd: dir })).rejects.toThrow(/No migrations config/);
  });

  it('errors when the config does not export a runner', async () => {
    await writeConfig('export default () => ({ notARunner: true });');
    await expect(runMigrateCommand({ action: 'up', cwd: dir })).rejects.toThrow(/must export a MigrationRunner/);
  });
});
