import { chmod, lstat, mkdir, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { CliError } from '../utils/cli-error';
import { fileExists } from '../utils/fs';
import { toValidPackageName } from '../utils/package-name';
import { createLibraryTemplate, type LibraryTemplateContext } from '../templates/library-template';
import { resolveModuleNames } from '../utils/module-names';

export interface GenerateLibOptions {
  libName: string;
  bunVersion: string;
  cwd?: string;
  force?: boolean;
  baseDir?: string;
}

export interface GenerateLibResult {
  libraryDir: string;
  packageName: string;
  createdFiles: string[];
  overwrittenFiles: string[];
}

const DEFAULT_BASE_DIR = 'libs';

export const runGenerateLibCommand = async (options: GenerateLibOptions): Promise<GenerateLibResult> => {
  const cwd = options.cwd ?? process.cwd();
  const baseDir = options.baseDir ?? DEFAULT_BASE_DIR;
  const targetDir = resolve(cwd, baseDir, options.libName);
  const baseName = basename(targetDir);

  if (!existsSync(targetDir)) {
    await mkdir(targetDir, { recursive: true });
  } else {
    const stats = await lstat(targetDir);
    if (!stats.isDirectory()) {
      throw new CliError(`Target path ${targetDir} exists and is not a directory.`);
    }

    const entries = await readdir(targetDir);
    const nonDotEntries = entries.filter((entry) => entry !== '.git' && entry !== '.gitkeep');
    if (nonDotEntries.length > 0 && !options.force) {
      throw new CliError(
        `Target directory ${targetDir} is not empty. Re-run with --force to allow overwriting generated files.`,
      );
    }
  }

  const packageName = toValidPackageName(baseName, 'nael-library');
  const { dirName: moduleDirName, className: moduleClassName } = resolveModuleNames(baseName);

  const templateContext: LibraryTemplateContext = {
    libraryName: baseName,
    packageName,
    bunVersion: options.bunVersion,
    moduleDirName,
    moduleClassName,
  };

  const templateFiles = createLibraryTemplate(templateContext);

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

  return {
    libraryDir: targetDir,
    packageName,
    createdFiles,
    overwrittenFiles,
  };
};
