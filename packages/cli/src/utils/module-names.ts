import { CliError } from './cli-error';
import { toKebabCase, toPascalCase } from './string-case';

export interface ModuleNames {
  dirName: string;
  className: string;
}

export const resolveModuleNames = (input: string): ModuleNames => {
  const dirName = toKebabCase(input);
  if (!dirName) {
    throw new CliError('Name must include at least one alphanumeric character.');
  }

  const pascalName = toPascalCase(input);
  if (!pascalName) {
    throw new CliError('Name must include alphabetic characters to build a class name.');
  }

  const className = pascalName.endsWith('Module') ? pascalName : `${pascalName}Module`;

  if (!/^[A-Za-z_]/.test(className)) {
    throw new CliError('Module class names must start with a letter or underscore.');
  }

  return { dirName, className };
};
