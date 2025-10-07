import { relative } from 'node:path';
import packageJson from '../package.json' assert { type: 'json' };
import { runGenerateLibCommand } from './commands/generate-lib';
import { runGenerateModuleCommand } from './commands/generate-module';
import { runNewCommand } from './commands/new';
import { CliError } from './utils/cli-error';

interface CliPackageJson {
  version?: string;
  config?: {
    frameworkVersion?: string;
    bunVersion?: string;
  };
}

const pkg = packageJson as CliPackageJson;
const frameworkVersion = pkg.config?.frameworkVersion ?? '^0.0.0';
const bunVersion = pkg.config?.bunVersion ?? '1.0.0';

const printBanner = () => {
  console.log('Nael Framework CLI');
};

const printHelp = () => {
  printBanner();
  console.log(`
Usage:
  nl new <project-name> [options]
  nl generate module <module-name> [options]
  nl generate lib <lib-name> [options]
  nl g module <module-name> [options]
  nl g lib <lib-name> [options]

Commands:
  new                           Scaffold a new Bun-native Nael Framework service
  generate module, g module     Scaffold a feature module under ./src/modules
  generate lib, g lib           Scaffold a reusable Bun-native library under ./libs

Options:
  --install         Run "bun install" after scaffolding
  --force, -f       Overwrite existing files in the target directory
  --help            Display this help message
  --version, -v     Show the CLI version
`);
};

interface ParsedArguments {
  command?: string;
  positionals: string[];
  flags: Set<string>;
}

const parseArguments = (argv: string[]): ParsedArguments => {
  const [, , ...rest] = argv;

  const flags = new Set<string>();
  const positionals: string[] = [];

  for (const value of rest) {
    if (value.startsWith('-')) {
      flags.add(value);
    } else {
      positionals.push(value);
    }
  }

  const command = positionals.shift();

  return { command, positionals, flags };
};

export const run = async (argv: string[] = Bun.argv): Promise<number> => {
  const { command, positionals, flags } = parseArguments(argv);

  if (flags.has('--version') || flags.has('-v') || command === '--version' || command === '-v') {
    console.log(pkg.version ?? '0.0.0');
    return 0;
  }

  if (flags.has('--help') || flags.has('-h') || command === 'help') {
    printHelp();
    return 0;
  }

  if (!command) {
    printHelp();
    return 0;
  }

  try {
    if (command === 'new') {
      const projectName = positionals[0];
      if (!projectName) {
        throw new CliError('Please provide a project name, e.g. "nl new my-service".');
      }

      const install = flags.has('--install');
      const force = flags.has('--force') || flags.has('-f');

      const result = await runNewCommand({
        projectName,
        frameworkVersion,
        bunVersion,
        force,
        install,
      });

      printBanner();
      console.log(`\nProject created at ${result.projectDir}`);

      if (result.createdFiles.length) {
        console.log('\nCreated files:');
        for (const file of result.createdFiles) {
          console.log(`  • ${file}`);
        }
      }

      if (result.overwrittenFiles.length) {
        console.log('\nOverwritten files:');
        for (const file of result.overwrittenFiles) {
          console.log(`  • ${file}`);
        }
      }

      console.log('\nNext steps:');
      const relPath = projectName === '.' ? '.' : projectName;
      if (relPath !== '.') {
        console.log(`  cd ${relPath}`);
      }
      if (!result.installedDependencies) {
        console.log('  bun install');
      }
      console.log('  bun run src/main.ts\n');

      return 0;
    }

    if (command === 'generate' || command === 'g') {
      const target = positionals[0];
      if (!target) {
        throw new CliError('Please specify what to generate, e.g. "nl g lib shared-utils".');
      }

      if (target === 'module') {
        const moduleName = positionals[1];
        if (!moduleName) {
          throw new CliError('Please provide a module name, e.g. "nl g module users".');
        }

        const force = flags.has('--force') || flags.has('-f');

        const result = await runGenerateModuleCommand({
          moduleName,
          force,
        });

        printBanner();
        const relDir = relative(process.cwd(), result.moduleDir) || '.';
        console.log(`\nModule created at ${result.moduleDir}`);

        if (result.createdFiles.length) {
          console.log('\nCreated files:');
          for (const file of result.createdFiles) {
            console.log(`  • ${file}`);
          }
        }

        if (result.overwrittenFiles.length) {
          console.log('\nOverwritten files:');
          for (const file of result.overwrittenFiles) {
            console.log(`  • ${file}`);
          }
        }

  console.log('\nNext steps:');
  console.log(`  Add services, controllers, or resolvers inside ${relDir}`);
  console.log('  Register the module wherever it should be consumed\n');

        return 0;
      }

      if (target === 'lib') {
        const libName = positionals[1];
        if (!libName) {
          throw new CliError('Please provide a library name, e.g. "nl g lib shared-utils".');
        }

        const force = flags.has('--force') || flags.has('-f');

        const result = await runGenerateLibCommand({
          libName,
          bunVersion,
          force,
        });

        printBanner();
        const relDir = relative(process.cwd(), result.libraryDir) || '.';
        console.log(`\nLibrary created at ${result.libraryDir}`);

        if (result.createdFiles.length) {
          console.log('\nCreated files:');
          for (const file of result.createdFiles) {
            console.log(`  • ${file}`);
          }
        }

        if (result.overwrittenFiles.length) {
          console.log('\nOverwritten files:');
          for (const file of result.overwrittenFiles) {
            console.log(`  • ${file}`);
          }
        }

        console.log('\nNext steps:');
        if (relDir !== '.') {
          console.log(`  cd ${relDir}`);
        }
        console.log('  bun run build');
        console.log('  bun test\n');

        return 0;
      }

      throw new CliError(`Unknown generate target: ${target}. Currently supported: module, lib`);
    }

    console.error(`Unknown command: ${command}`);
    printHelp();
    return 1;
  } catch (error) {
    if (error instanceof CliError) {
      console.error(`Error: ${error.message}`);
      return error.exitCode;
    }

    console.error('Unexpected error while running the CLI');
    console.error(error);
    return 1;
  }
};
