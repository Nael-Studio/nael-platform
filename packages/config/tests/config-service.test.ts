import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ConfigLoader, ConfigService } from '../src/index';

describe('ConfigService', () => {
  const service = new ConfigService({
    app: { name: 'nael', port: 8080, debug: false },
    nested: { a: { b: { c: 'deep' } } },
    empty: null,
  });

  it('resolves nested keys via dotted paths', () => {
    expect(service.get('app.name')).toBe('nael');
    expect(service.get('nested.a.b.c')).toBe('deep');
  });

  it('returns undefined for a missing path and the default when provided', () => {
    expect(service.get('app.missing')).toBeUndefined();
    expect(service.get('app.missing', 'fallback')).toBe('fallback');
    expect(service.get('does.not.exist.at.all')).toBeUndefined();
  });

  it('applies the default for a stored null but not for falsy scalars', () => {
    expect(service.get('empty', 'defaulted')).toBe('defaulted');
    expect(service.get('app.debug', true)).toBe(false);
    expect(service.get('app.port', 1)).toBe(8080);
  });

  it('reports presence with has(), treating stored null as present', () => {
    expect(service.has('app.name')).toBe(true);
    expect(service.has('empty')).toBe(true);
    expect(service.has('app.missing')).toBe(false);
  });

  it('exposes the whole config via all()', () => {
    expect(service.all()).toEqual({
      app: { name: 'nael', port: 8080, debug: false },
      nested: { a: { b: { c: 'deep' } } },
      empty: null,
    });
  });
});

describe('ConfigLoader.load', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'nl-config-'));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('merges default.yaml with an env-specific file, letting env win', async () => {
    await writeFile(join(dir, 'default.yaml'), 'app:\n  name: base\n  port: 8080\n');
    await writeFile(join(dir, 'production.yaml'), 'app:\n  port: 9090\n');

    const config = await ConfigLoader.load({ dir, env: 'production' });
    expect(config).toEqual({ app: { name: 'base', port: 9090 } });
  });

  it('silently ignores a missing default.yaml', async () => {
    const config = await ConfigLoader.load({ dir, overrides: { flag: true } });
    expect(config).toEqual({ flag: true });
  });

  it('skips env detection entirely when explicit files are given', async () => {
    await writeFile(join(dir, 'default.yaml'), 'a: 1\n');
    await writeFile(join(dir, 'production.yaml'), 'a: 999\n');
    await writeFile(join(dir, 'custom.yaml'), 'b: 2\n');

    const config = await ConfigLoader.load({ dir, env: 'production', files: ['custom.yaml'] });
    // production.yaml is NOT loaded because `files` overrides env detection.
    expect(config).toEqual({ a: 1, b: 2 });
  });

  it('concatenates arrays across merged files', async () => {
    await writeFile(join(dir, 'default.yaml'), 'flags:\n  - base\n');
    await writeFile(join(dir, 'staging.yaml'), 'flags:\n  - beta\n');

    const config = (await ConfigLoader.load({ dir, env: 'staging' })) as { flags: string[] };
    expect(config.flags).toEqual(['base', 'beta']);
  });

  it('honors the APP_ENV environment variable when no env option is passed', async () => {
    await writeFile(join(dir, 'default.yaml'), 'app:\n  tier: base\n');
    await writeFile(join(dir, 'qa.yaml'), 'app:\n  tier: qa\n');

    const previous = process.env.APP_ENV;
    process.env.APP_ENV = 'qa';
    try {
      const config = (await ConfigLoader.load({ dir })) as { app: { tier: string } };
      expect(config.app.tier).toBe('qa');
    } finally {
      if (previous === undefined) {
        delete process.env.APP_ENV;
      } else {
        process.env.APP_ENV = previous;
      }
    }
  });

  it('merges overrides last', async () => {
    await writeFile(join(dir, 'default.yaml'), 'app:\n  port: 8080\n');
    const config = (await ConfigLoader.load({
      dir,
      overrides: { app: { port: 3000 } },
    })) as { app: { port: number } };
    expect(config.app.port).toBe(3000);
  });
});
