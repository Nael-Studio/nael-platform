import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { runNewCommand } from '../src/commands/new';

const CLI_PKG = resolve(import.meta.dir, '../package.json');

describe('nl new app', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'nl-new-'));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('scaffolds a backend project without running install', async () => {
    const result = await runNewCommand({
      projectName: 'demo-service',
      frameworkVersion: '^1.2.3',
      bunVersion: '1.1.99',
      cwd: dir,
      install: false,
      withNext: false,
    });

    expect(result.packageName).toBe('demo-service');
    expect(result.installedDependencies).toBe(false);
    expect(result.createdFiles).toEqual(
      expect.arrayContaining(['package.json', 'src/main.ts', 'src/app.module.ts']),
    );
  });

  it('pins every @nl-framework dependency to the provided framework version', async () => {
    await runNewCommand({
      projectName: 'versioned',
      frameworkVersion: '^1.2.3',
      bunVersion: '1.1.99',
      cwd: dir,
      install: false,
      withNext: false,
    });

    const pkg = JSON.parse(await readFile(join(dir, 'versioned/package.json'), 'utf8')) as {
      packageManager: string;
      dependencies: Record<string, string>;
      devDependencies: Record<string, string>;
    };

    for (const name of Object.keys(pkg.dependencies)) {
      if (name.startsWith('@nl-framework/')) {
        expect(pkg.dependencies[name]).toBe('^1.2.3');
      }
    }
    expect(pkg.packageManager).toBe('bun@1.1.99');
    expect(pkg.devDependencies['bun-types']).toBe('^1.1.99');
  });

  it("scaffolds with the CLI's own configured current framework version", async () => {
    // Mirrors what the `nl` binary injects: config.frameworkVersion from the CLI
    // package.json (kept in sync by scripts/bump-version.ts).
    const cliPkg = JSON.parse(await readFile(CLI_PKG, 'utf8')) as {
      config?: { frameworkVersion?: string; bunVersion?: string };
    };
    const frameworkVersion = cliPkg.config?.frameworkVersion;
    expect(frameworkVersion).toBeDefined();

    await runNewCommand({
      projectName: 'current',
      frameworkVersion: frameworkVersion!,
      bunVersion: cliPkg.config?.bunVersion ?? '1.0.0',
      cwd: dir,
      install: false,
      withNext: false,
    });

    const pkg = JSON.parse(await readFile(join(dir, 'current/package.json'), 'utf8')) as {
      dependencies: Record<string, string>;
    };
    expect(pkg.dependencies['@nl-framework/core']).toBe(frameworkVersion);
    expect(pkg.dependencies['@nl-framework/platform']).toBe(frameworkVersion);
  });
});
