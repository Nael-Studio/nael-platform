import { lstat, mkdir, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { CliError } from '../utils/cli-error';
import { fileExists } from '../utils/fs';
import { createModuleTemplate } from '../templates/module-template';
import { resolveModuleNames } from '../utils/module-names';

export interface GenerateModuleOptions {
  moduleName: string;
  cwd?: string;
  baseDir?: string;
  force?: boolean;
}

export interface GenerateModuleResult {
  moduleDir: string;
  moduleClassName: string;
  createdFiles: string[];
  overwrittenFiles: string[];
}

const DEFAULT_BASE_DIR = 'src/modules';

export const runGenerateModuleCommand = async (
  options: GenerateModuleOptions,
): Promise<GenerateModuleResult> => {
  const cwd = options.cwd ?? process.cwd();
  const baseDir = options.baseDir ?? DEFAULT_BASE_DIR;
  const { dirName, className } = resolveModuleNames(options.moduleName);

  const moduleRootDir = resolve(cwd, baseDir);
  const targetDir = resolve(moduleRootDir, dirName);

  await mkdir(moduleRootDir, { recursive: true });

  if (existsSync(targetDir)) {
    const stats = await lstat(targetDir);
    if (!stats.isDirectory()) {
      throw new CliError(`Target path ${targetDir} exists and is not a directory.`);
    }

    const entries = await readdir(targetDir);
    const nonDotEntries = entries.filter((entry) => entry !== '.gitkeep');
    if (nonDotEntries.length > 0 && !options.force) {
      throw new CliError(
        `Target directory ${targetDir} is not empty. Re-run with --force to allow overwriting generated files.`,
      );
    }
  }

  const templateFiles = createModuleTemplate({
    baseDir,
    moduleDirName: dirName,
    moduleClassName: className,
  });

  const createdFiles: string[] = [];
  const overwrittenFiles: string[] = [];

  for (const file of templateFiles) {
    const destination = resolve(cwd, file.path);
    const destinationDir = dirname(destination);
    await mkdir(destinationDir, { recursive: true });

    const alreadyExists = await fileExists(destination);
    if (alreadyExists && !options.force) {
      throw new CliError(
        `File ${relative(cwd, destination)} already exists. Use --force to overwrite generated files.`,
      );
    }

    await Bun.write(destination, file.contents);

    if (alreadyExists) {
      overwrittenFiles.push(relative(cwd, destination));
    } else {
      createdFiles.push(relative(cwd, destination));
    }
  }

  const modulesIndexPath = resolve(moduleRootDir, 'index.ts');
  const exportLine = `export * from './${dirName}';`;
  const exportLineWithNewline = `${exportLine}\n`;

  if (await fileExists(modulesIndexPath)) {
    const current = await Bun.file(modulesIndexPath).text();
    const alreadyExported = current
      .split(/\r?\n/)
      .map((line) => line.trim())
      .includes(exportLine);

    if (!alreadyExported) {
      const nextContent = current.endsWith('\n') ? `${current}${exportLine}\n` : `${current}\n${exportLine}\n`;
      await Bun.write(modulesIndexPath, nextContent);
      overwrittenFiles.push(relative(cwd, modulesIndexPath));
    }
  } else {
    await mkdir(dirname(modulesIndexPath), { recursive: true });
    await Bun.write(modulesIndexPath, exportLineWithNewline);
    createdFiles.push(relative(cwd, modulesIndexPath));
  }

  return {
    moduleDir: targetDir,
    moduleClassName: className,
    createdFiles,
    overwrittenFiles,
  };
};
