import { mkdir } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { CliError } from '../utils/cli-error';
import { fileExists } from '../utils/fs';
import { appendExportLine } from '../utils/module-file';
import { createMigrationTemplate } from '../templates/migration-template';
import { toKebabCase, toPascalCase } from '../utils/string-case';

export interface GenerateMigrationOptions {
  name: string;
  cwd?: string;
  baseDir?: string;
  force?: boolean;
  /** Injectable timestamp for deterministic output (defaults to now, `YYYYMMDDHHmmss`). */
  timestamp?: string;
}

export interface GenerateMigrationResult {
  migrationsDir: string;
  migrationFile: string;
  createdFiles: string[];
  overwrittenFiles: string[];
}

const DEFAULT_BASE_DIR = 'src/migrations';

const formatTimestamp = (date: Date): string => {
  const pad = (n: number, width = 2): string => String(n).padStart(width, '0');
  return (
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}` +
    `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  );
};

const pushUnique = (collection: string[], value: string): void => {
  if (!collection.includes(value)) {
    collection.push(value);
  }
};

export const runGenerateMigrationCommand = async (
  options: GenerateMigrationOptions,
): Promise<GenerateMigrationResult> => {
  const slug = toKebabCase(options.name);
  if (!slug) {
    throw new CliError('Migration name must include at least one alphanumeric character.');
  }
  const pascal = toPascalCase(options.name);
  if (!pascal) {
    throw new CliError('Migration name must include alphabetic characters to build a class name.');
  }

  const cwd = options.cwd ?? process.cwd();
  const baseDir = options.baseDir ?? DEFAULT_BASE_DIR;
  const timestamp = options.timestamp ?? formatTimestamp(new Date());

  const migrationName = `${timestamp}_${slug}`;
  const fileName = `${timestamp}-${slug}.migration`;
  const className = `${pascal}Migration`;

  const migrationsDir = resolve(cwd, baseDir);
  const templateFiles = createMigrationTemplate({ className, migrationName, fileName });

  const createdFiles: string[] = [];
  const overwrittenFiles: string[] = [];

  for (const file of templateFiles) {
    const destination = join(migrationsDir, file.path);
    await mkdir(dirname(destination), { recursive: true });

    const alreadyExists = await fileExists(destination);
    if (alreadyExists && !options.force) {
      throw new CliError(
        `File ${relative(cwd, destination)} already exists. Use --force to overwrite generated files.`,
      );
    }

    await Bun.write(destination, file.contents);
    if (alreadyExists) {
      pushUnique(overwrittenFiles, relative(cwd, destination));
    } else {
      pushUnique(createdFiles, relative(cwd, destination));
    }
  }

  const indexPath = join(migrationsDir, 'index.ts');
  const status = await appendExportLine(indexPath, `export * from './${fileName}';`);
  if (status === 'created') {
    pushUnique(createdFiles, relative(cwd, indexPath));
  } else if (status === 'updated') {
    pushUnique(overwrittenFiles, relative(cwd, indexPath));
  }

  return {
    migrationsDir,
    migrationFile: join(migrationsDir, `${fileName}.ts`),
    createdFiles,
    overwrittenFiles,
  };
};
