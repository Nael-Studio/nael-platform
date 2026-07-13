import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { mkdtemp, rm, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { runGenerateModuleCommand } from '../src/commands/generate-module';
import { runGenerateServiceCommand } from '../src/commands/generate-service';
import { runGenerateControllerCommand } from '../src/commands/generate-controller';
import { runGenerateResolverCommand } from '../src/commands/generate-resolver';
import { runGenerateModelCommand } from '../src/commands/generate-model';

const REPO_ROOT = resolve(import.meta.dir, '../../..');
const TSC_BIN = join(REPO_ROOT, 'node_modules/.bin/tsc');

// Ambient stubs so generated files type-check in isolation, without installing
// the framework packages into the temp project (keeps the check offline + fast).
const FRAMEWORK_SHIM = `
declare module '@nl-framework/core' {
  export const Module: any;
  export const Injectable: any;
}
declare module '@nl-framework/http' {
  export const Controller: any;
  export const Get: any;
}
declare module '@nl-framework/graphql' {
  export const Resolver: any;
  export const Query: any;
  export const ObjectType: any;
  export const Field: any;
  export const ID: any;
}
`;

const TSCONFIG = JSON.stringify(
  {
    compilerOptions: {
      target: 'ES2022',
      module: 'ESNext',
      moduleResolution: 'Bundler',
      strict: true,
      noUncheckedIndexedAccess: true,
      experimentalDecorators: true,
      emitDecoratorMetadata: true,
      skipLibCheck: true,
      noEmit: true,
      types: [],
    },
    include: ['src/**/*.ts', 'nl-framework.d.ts'],
  },
  null,
  2,
);

describe('nl generators', () => {
  let dir: string;

  const read = (relPath: string) => readFile(join(dir, relPath), 'utf8');

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'nl-gen-'));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('scaffolds a module with the expected file tree and class', async () => {
    const result = await runGenerateModuleCommand({ moduleName: 'users', cwd: dir });

    expect(result.moduleClassName).toBe('UsersModule');
    expect(result.createdFiles).toEqual([
      'src/modules/users/index.ts',
      'src/modules/users/users.module.ts',
      'src/modules/users/controllers/.gitkeep',
      'src/modules/users/services/.gitkeep',
      'src/modules/users/resolvers/.gitkeep',
      'src/modules/users/models/.gitkeep',
      'src/modules/index.ts',
    ]);

    const moduleFile = await read('src/modules/users/users.module.ts');
    expect(moduleFile).toContain("import { Module } from '@nl-framework/core';");
    expect(moduleFile).toContain('@Module({');
    expect(moduleFile).toContain('export class UsersModule {}');

    expect(await read('src/modules/index.ts')).toContain("export * from './users';");
  });

  it('generates service/controller/resolver/model and wires them into the module', async () => {
    await runGenerateModuleCommand({ moduleName: 'users', cwd: dir });

    const service = await runGenerateServiceCommand({
      serviceName: 'users',
      moduleName: 'users',
      cwd: dir,
    });
    expect(service.createdFiles).toEqual(['src/modules/users/services/users.service.ts']);
    expect(await read('src/modules/users/services/users.service.ts')).toContain(
      'export class UsersService {',
    );

    const controller = await runGenerateControllerCommand({
      controllerName: 'users',
      moduleName: 'users',
      cwd: dir,
    });
    expect(controller.createdFiles).toEqual(['src/modules/users/controllers/users.controller.ts']);
    const controllerFile = await read('src/modules/users/controllers/users.controller.ts');
    expect(controllerFile).toContain("import { Controller, Get } from '@nl-framework/http';");
    expect(controllerFile).toContain("@Controller('users')");

    await runGenerateResolverCommand({ resolverName: 'users', moduleName: 'users', cwd: dir });
    expect(await read('src/modules/users/resolvers/users.resolver.ts')).toContain(
      'export class UsersResolver {',
    );

    const model = await runGenerateModelCommand({
      modelName: 'user',
      moduleName: 'users',
      cwd: dir,
    });
    expect(model.createdFiles).toContain('src/modules/users/models/user.model.ts');
    const modelFile = await read('src/modules/users/models/user.model.ts');
    expect(modelFile).toContain('@ObjectType()');
    expect(modelFile).toContain('export class User {');

    // The generators edit the module decorator arrays as a side effect.
    const moduleFile = await read('src/modules/users/users.module.ts');
    expect(moduleFile).toContain('controllers: [UsersController]');
    expect(moduleFile).toContain('providers: [UsersService, UsersResolver]');
  });

  it('refuses to generate a service when its module does not exist', async () => {
    await expect(
      runGenerateServiceCommand({ serviceName: 'orders', moduleName: 'orders', cwd: dir }),
    ).rejects.toThrow(/not found/i);
  });

  it('refuses to overwrite a non-empty module without --force', async () => {
    await runGenerateModuleCommand({ moduleName: 'users', cwd: dir });
    await expect(runGenerateModuleCommand({ moduleName: 'users', cwd: dir })).rejects.toThrow(
      /not empty|--force/i,
    );
  });

  it('produces TypeScript that type-checks with tsc --noEmit', async () => {
    await runGenerateModuleCommand({ moduleName: 'billing', cwd: dir });
    await runGenerateServiceCommand({ serviceName: 'invoices', moduleName: 'billing', cwd: dir });
    await runGenerateControllerCommand({
      controllerName: 'invoices',
      moduleName: 'billing',
      cwd: dir,
    });
    await runGenerateResolverCommand({ resolverName: 'invoices', moduleName: 'billing', cwd: dir });
    await runGenerateModelCommand({ modelName: 'invoice', moduleName: 'billing', cwd: dir });

    await writeFile(join(dir, 'nl-framework.d.ts'), FRAMEWORK_SHIM);
    await writeFile(join(dir, 'tsconfig.json'), TSCONFIG);

    expect(existsSync(TSC_BIN)).toBe(true);
    const proc = Bun.spawnSync([TSC_BIN, '--noEmit', '--project', join(dir, 'tsconfig.json')], {
      cwd: dir,
    });
    const output = `${proc.stdout.toString()}${proc.stderr.toString()}`;
    expect(output).toBe('');
    expect(proc.exitCode).toBe(0);
  }, 30000);
});
