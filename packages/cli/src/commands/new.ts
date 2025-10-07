import { access, chmod, lstat, mkdir, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { CliError } from '../utils/cli-error';
import { createProjectTemplate, type ProjectTemplateContext, type TemplateFile } from '../templates/project-template';

const fileExists = async (path: string): Promise<boolean> => {
  try {
    await access(path);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return false;
    }
    throw error;
  }
};

const toValidPackageName = (name: string): string => {
  const normalized = name
    .trim()
    .toLowerCase()
    .replace(/^@/, '')
    .replace(/[^a-z0-9~.-]+/g, '-');

  return normalized.length ? normalized : 'nael-app';
};

export interface NewCommandOptions {
  projectName: string;
  frameworkVersion: string;
  bunVersion: string;
  cwd?: string;
  force?: boolean;
  install?: boolean;
}

export interface NewCommandResult {
  projectDir: string;
  packageName: string;
  createdFiles: string[];
  overwrittenFiles: string[];
  installedDependencies: boolean;
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

  for (const file of templateFiles) {
    const destination = join(targetDir, file.path);
    const destinationDir = dirname(destination);
    await mkdir(destinationDir, { recursive: true });

    const alreadyExists = await fileExists(destination);
    if (alreadyExists && !options.force) {
      throw new CliError(
        `File ${relative(targetDir, destination)} already exists. Use --force to overwrite generated files.`,
      );
    }

    await Bun.write(destination, file.contents);
    if (file.mode) {
      await chmod(destination, file.mode);
    }

    if (alreadyExists) {
      overwrittenFiles.push(relative(targetDir, destination));
    } else {
      createdFiles.push(relative(targetDir, destination));
    }
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
  }

  return {
    projectDir: targetDir,
    packageName,
    createdFiles,
    overwrittenFiles,
    installedDependencies: Boolean(options.install),
  };
};
