import { mkdir } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { CliError } from '../utils/cli-error';
import { fileExists } from '../utils/fs';
import { resolveModuleNames } from '../utils/module-names';
import { insertImportIfMissing, addSymbolToModuleArray, appendExportLine } from '../utils/module-file';
import { createServiceTemplate } from '../templates/service-template';
import { toKebabCase, toPascalCase } from '../utils/string-case';

export interface GenerateServiceOptions {
  serviceName: string;
  moduleName: string;
  cwd?: string;
  baseDir?: string;
  force?: boolean;
}

export interface GenerateServiceResult {
  moduleDir: string;
  serviceFile: string;
  createdFiles: string[];
  overwrittenFiles: string[];
}

const DEFAULT_BASE_DIR = 'src/modules';

const resolveServiceClassName = (input: string): { className: string; fileName: string } => {
  const fileSlug = toKebabCase(input);
  if (!fileSlug) {
    throw new CliError('Service name must include at least one alphanumeric character.');
  }

  const baseName = toPascalCase(input);
  if (!baseName) {
    throw new CliError('Service name must include alphabetic characters to build a class name.');
  }

  const className = baseName.endsWith('Service') ? baseName : `${baseName}Service`;
  return { className, fileName: `${fileSlug}.service` };
};

const pushUnique = (collection: string[], value: string) => {
  if (!collection.includes(value)) {
    collection.push(value);
  }
};

export const runGenerateServiceCommand = async (
  options: GenerateServiceOptions,
): Promise<GenerateServiceResult> => {
  if (!options.moduleName) {
    throw new CliError('Please provide a module name with --module or as an additional argument.');
  }

  const cwd = options.cwd ?? process.cwd();
  const baseDir = options.baseDir ?? DEFAULT_BASE_DIR;
  const { dirName: moduleDirName } = resolveModuleNames(options.moduleName);
  const { className: serviceClassName, fileName: serviceFileName } = resolveServiceClassName(options.serviceName);

  const moduleDir = resolve(cwd, baseDir, moduleDirName);
  const moduleFilePath = join(moduleDir, `${moduleDirName}.module.ts`);

  if (!(await fileExists(moduleFilePath))) {
    throw new CliError(
      `Module ${options.moduleName} not found at ${relative(cwd, moduleFilePath)}. Run "nl g module ${options.moduleName}" first.`,
    );
  }

  const serviceTemplateFiles = createServiceTemplate({
    serviceClassName,
    serviceFileName: join('services', serviceFileName),
  });

  const createdFiles: string[] = [];
  const overwrittenFiles: string[] = [];

  for (const file of serviceTemplateFiles) {
    const destination = join(moduleDir, file.path);
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
      pushUnique(overwrittenFiles, relative(cwd, destination));
    } else {
      pushUnique(createdFiles, relative(cwd, destination));
    }
  }

  const moduleFile = Bun.file(moduleFilePath);
  let moduleContent = await moduleFile.text();

  const importStatement = `import { ${serviceClassName} } from './services/${serviceFileName}';`;
  const importUpdate = insertImportIfMissing(moduleContent, importStatement);
  moduleContent = importUpdate.content;

  const providersUpdate = addSymbolToModuleArray(moduleContent, 'providers', serviceClassName);
  moduleContent = providersUpdate.content;

  if (importUpdate.added || providersUpdate.changed) {
    await Bun.write(moduleFilePath, `${moduleContent}\n`);
    pushUnique(overwrittenFiles, relative(cwd, moduleFilePath));
  }

  const moduleIndexPath = join(moduleDir, 'index.ts');
  const exportStatus = await appendExportLine(
    moduleIndexPath,
    `export * from './services/${serviceFileName}';`,
  );

  if (exportStatus === 'created') {
    pushUnique(createdFiles, relative(cwd, moduleIndexPath));
  } else if (exportStatus === 'updated') {
    pushUnique(overwrittenFiles, relative(cwd, moduleIndexPath));
  }

  return {
    moduleDir,
    serviceFile: join(moduleDir, 'services', `${serviceFileName}.ts`),
    createdFiles,
    overwrittenFiles,
  };
};