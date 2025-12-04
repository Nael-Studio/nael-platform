import { chmod, lstat, mkdir, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { CliError } from '../utils/cli-error';
import { createProjectTemplate, type ProjectTemplateContext, type TemplateFile } from '../templates/project-template';
import { createNextTemplate } from '../templates/next-template';
import { fileExists } from '../utils/fs';
import { toValidPackageName } from '../utils/package-name';

export interface NewCommandOptions {
  projectName: string;
  frameworkVersion: string;
  bunVersion: string;
  cwd?: string;
  force?: boolean;
  install?: boolean;
  withNext?: boolean;
  nextAppName?: string;
}

export interface NewCommandResult {
  projectDir: string;
  packageName: string;
  createdFiles: string[];
  overwrittenFiles: string[];
  installedDependencies: boolean;
  frontend?: {
    directory: string;
    createdFiles: string[];
    overwrittenFiles: string[];
    installedDependencies: boolean;
  };
}

export const runNewCommand = async (options: NewCommandOptions): Promise<NewCommandResult> => {
  const cwd = options.cwd ?? process.cwd();
  const inPlace = options.projectName === '.';
  const targetDir = inPlace ? cwd : resolve(cwd, options.projectName);
  const baseName = basename(targetDir);

  const projectStatsExists = existsSync(targetDir);
  if (!projectStatsExists) {
    await mkdir(targetDir, { recursive: true });
  } else {
    const stats = await lstat(targetDir);
    if (!stats.isDirectory()) {
      throw new CliError(`Target path ${targetDir} exists and is not a directory.`);
    }
    const entries = await readdir(targetDir);
    const nonDotEntries = entries.filter((entry) => entry !== '.git' && entry !== '.gitkeep');
    if (nonDotEntries.length > 0 && !options.force && !inPlace) {
      throw new CliError(
        `Target directory ${targetDir} is not empty. Re-run with --force to allow overwriting generated files.`,
      );
    }
  }

  const packageName = toValidPackageName(baseName);

  const templateContext: ProjectTemplateContext = {
    projectName: baseName,
    packageName,
    frameworkVersion: options.frameworkVersion,
    bunVersion: options.bunVersion,
  };

  const templateFiles = createProjectTemplate(templateContext);

  const createdFiles: string[] = [];
  const overwrittenFiles: string[] = [];

  const writeTemplateFiles = async (
    baseDir: string,
    files: TemplateFile[],
    accumulator: { created: string[]; overwritten: string[] },
  ) => {
    for (const file of files) {
      const destination = join(baseDir, file.path);
      const destinationDir = dirname(destination);
      await mkdir(destinationDir, { recursive: true });

      const alreadyExists = await fileExists(destination);
      if (alreadyExists && !options.force) {
        throw new CliError(
          `File ${relative(baseDir, destination)} already exists. Use --force to overwrite generated files.`,
        );
      }

      await Bun.write(destination, file.contents);
      if (file.mode) {
        await chmod(destination, file.mode);
      }

      if (alreadyExists) {
        accumulator.overwritten.push(relative(baseDir, destination));
      } else {
        accumulator.created.push(relative(baseDir, destination));
      }
    }
  };

  await writeTemplateFiles(targetDir, templateFiles, { created: createdFiles, overwritten: overwrittenFiles });

  let frontendResult: NewCommandResult['frontend'];
  if (options.withNext) {
    const nextAppName = options.nextAppName ?? 'web';
    const nextPackageName = toValidPackageName(nextAppName);
    const nextDir = join(targetDir, nextAppName);
    const nextTemplateFiles = createNextTemplate({
      appName: nextAppName,
      packageName: nextPackageName,
      bunVersion: options.bunVersion,
      directory: nextAppName,
    });

    const nextCreated: string[] = [];
    const nextOverwritten: string[] = [];

    const nextStatsExists = existsSync(nextDir);
    if (!nextStatsExists) {
      await mkdir(nextDir, { recursive: true });
    }

    await writeTemplateFiles(nextDir, nextTemplateFiles, { created: nextCreated, overwritten: nextOverwritten });

    frontendResult = {
      directory: nextDir,
      createdFiles: nextCreated,
      overwrittenFiles: nextOverwritten,
      installedDependencies: false,
    };
  }

  if (options.install) {
    const installProcess = Bun.spawn(['bun', 'install'], {
      cwd: targetDir,
      stdout: 'inherit',
      stderr: 'inherit',
    });

    const exitCode = await installProcess.exited;
    if (exitCode !== 0) {
      throw new CliError('bun install failed', exitCode ?? 1);
    }

    if (frontendResult) {
      const nextInstall = Bun.spawn(['bun', 'install'], {
        cwd: frontendResult.directory,
        stdout: 'inherit',
        stderr: 'inherit',
      });
      const nextExit = await nextInstall.exited;
      if (nextExit !== 0) {
        throw new CliError('bun install failed in Next.js app', nextExit ?? 1);
      }
      frontendResult.installedDependencies = true;
    }
  }

  return {
    projectDir: targetDir,
    packageName,
    createdFiles,
    overwrittenFiles,
    installedDependencies: Boolean(options.install),
    frontend: frontendResult,
  };
};
