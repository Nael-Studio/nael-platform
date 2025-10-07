import { mkdir } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { CliError } from '../utils/cli-error';
import { fileExists } from '../utils/fs';
import { resolveModuleNames } from '../utils/module-names';
import { insertImportIfMissing, addSymbolToModuleArray, appendExportLine } from '../utils/module-file';
import { createResolverTemplate } from '../templates/resolver-template';
import { toKebabCase, toPascalCase } from '../utils/string-case';

export interface GenerateResolverOptions {
  resolverName: string;
  moduleName: string;
  cwd?: string;
  baseDir?: string;
  force?: boolean;
}

export interface GenerateResolverResult {
  moduleDir: string;
  resolverFile: string;
  createdFiles: string[];
  overwrittenFiles: string[];
}

const DEFAULT_BASE_DIR = 'src/modules';

const resolveResolverNames = (
  input: string,
): { className: string; fileName: string } => {
  const slug = toKebabCase(input);
  if (!slug) {
    throw new CliError('Resolver name must include at least one alphanumeric character.');
  }

  const baseName = toPascalCase(input);
  if (!baseName) {
    throw new CliError('Resolver name must include alphabetic characters to build a class name.');
  }

  const className = baseName.endsWith('Resolver') ? baseName : `${baseName}Resolver`;
  return { className, fileName: `${slug}.resolver` };
};

const pushUnique = (collection: string[], value: string) => {
  if (!collection.includes(value)) {
    collection.push(value);
  }
};

export const runGenerateResolverCommand = async (
  options: GenerateResolverOptions,
): Promise<GenerateResolverResult> => {
  if (!options.moduleName) {
    throw new CliError('Please provide a module name with --module or as an additional argument.');
  }

  const cwd = options.cwd ?? process.cwd();
  const baseDir = options.baseDir ?? DEFAULT_BASE_DIR;
  const { dirName: moduleDirName } = resolveModuleNames(options.moduleName);
  const { className, fileName } = resolveResolverNames(options.resolverName);

  const moduleDir = resolve(cwd, baseDir, moduleDirName);
  const moduleFilePath = join(moduleDir, `${moduleDirName}.module.ts`);

  if (!(await fileExists(moduleFilePath))) {
    throw new CliError(
      `Module ${options.moduleName} not found at ${relative(cwd, moduleFilePath)}. Run "nl g module ${options.moduleName}" first.`,
    );
  }

  const templateFiles = createResolverTemplate({
    resolverClassName: className,
    resolverFileName: join('resolvers', fileName),
  });

  const createdFiles: string[] = [];
  const overwrittenFiles: string[] = [];

  for (const file of templateFiles) {
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

  const importStatement = `import { ${className} } from './resolvers/${fileName}';`;
  const importUpdate = insertImportIfMissing(moduleContent, importStatement);
  moduleContent = importUpdate.content;

  const providersUpdate = addSymbolToModuleArray(moduleContent, 'providers', className);
  moduleContent = providersUpdate.content;

  if (importUpdate.added || providersUpdate.changed) {
    await Bun.write(moduleFilePath, `${moduleContent}\n`);
    pushUnique(overwrittenFiles, relative(cwd, moduleFilePath));
  }

  const moduleIndexPath = join(moduleDir, 'index.ts');
  const exportStatus = await appendExportLine(
    moduleIndexPath,
    `export * from './resolvers/${fileName}';`,
  );

  if (exportStatus === 'created') {
    pushUnique(createdFiles, relative(cwd, moduleIndexPath));
  } else if (exportStatus === 'updated') {
    pushUnique(overwrittenFiles, relative(cwd, moduleIndexPath));
  }

  return {
    moduleDir,
    resolverFile: join(moduleDir, 'resolvers', `${fileName}.ts`),
    createdFiles,
    overwrittenFiles,
  };
};
