import { mkdir } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { CliError } from '../utils/cli-error';
import { fileExists } from '../utils/fs';
import { resolveModuleNames } from '../utils/module-names';
import { appendExportLine } from '../utils/module-file';
import { createModelTemplate } from '../templates/model-template';
import { toKebabCase, toPascalCase } from '../utils/string-case';

export interface GenerateModelOptions {
  modelName: string;
  moduleName: string;
  cwd?: string;
  baseDir?: string;
  force?: boolean;
}

export interface GenerateModelResult {
  moduleDir: string;
  modelFile: string;
  createdFiles: string[];
  overwrittenFiles: string[];
}

const DEFAULT_BASE_DIR = 'src/modules';

const resolveModelNames = (
  input: string,
): { className: string; fileName: string } => {
  const slug = toKebabCase(input);
  if (!slug) {
    throw new CliError('Model name must include at least one alphanumeric character.');
  }

  const baseName = toPascalCase(input);
  if (!baseName) {
    throw new CliError('Model name must include alphabetic characters to build a class name.');
  }

  return { className: baseName, fileName: `${slug}.model` };
};

const pushUnique = (collection: string[], value: string) => {
  if (!collection.includes(value)) {
    collection.push(value);
  }
};

export const runGenerateModelCommand = async (
  options: GenerateModelOptions,
): Promise<GenerateModelResult> => {
  if (!options.moduleName) {
    throw new CliError('Please provide a module name with --module or as an additional argument.');
  }

  const cwd = options.cwd ?? process.cwd();
  const baseDir = options.baseDir ?? DEFAULT_BASE_DIR;
  const { dirName: moduleDirName } = resolveModuleNames(options.moduleName);
  const { className, fileName } = resolveModelNames(options.modelName);

  const moduleDir = resolve(cwd, baseDir, moduleDirName);
  const moduleFilePath = join(moduleDir, `${moduleDirName}.module.ts`);

  if (!(await fileExists(moduleFilePath))) {
    throw new CliError(
      `Module ${options.moduleName} not found at ${relative(cwd, moduleFilePath)}. Run "nl g module ${options.moduleName}" first.`,
    );
  }

  const templateFiles = createModelTemplate({
    modelClassName: className,
    modelFileName: join('models', fileName),
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

  const modelsIndexPath = join(moduleDir, 'models', 'index.ts');
  const modelsIndexStatus = await appendExportLine(modelsIndexPath, `export * from './${fileName}';`);
  if (modelsIndexStatus === 'created') {
    pushUnique(createdFiles, relative(cwd, modelsIndexPath));
  } else if (modelsIndexStatus === 'updated') {
    pushUnique(overwrittenFiles, relative(cwd, modelsIndexPath));
  }

  const moduleIndexPath = join(moduleDir, 'index.ts');
  const moduleIndexStatus = await appendExportLine(moduleIndexPath, `export * from './models/${fileName}';`);
  if (moduleIndexStatus === 'created') {
    pushUnique(createdFiles, relative(cwd, moduleIndexPath));
  } else if (moduleIndexStatus === 'updated') {
    pushUnique(overwrittenFiles, relative(cwd, moduleIndexPath));
  }

  return {
    moduleDir,
    modelFile: join(moduleDir, 'models', `${fileName}.ts`),
    createdFiles,
    overwrittenFiles,
  };
};
