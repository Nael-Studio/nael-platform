import { relative } from 'node:path';
import packageJson from '../package.json' assert { type: 'json' };
import { runGenerateLibCommand } from './commands/generate-lib';
import { runGenerateModuleCommand } from './commands/generate-module';
import { runGenerateServiceCommand } from './commands/generate-service';
import { runGenerateControllerCommand } from './commands/generate-controller';
import { runGenerateResolverCommand } from './commands/generate-resolver';
import { runGenerateModelCommand } from './commands/generate-model';
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
  nl generate service <service-name> --module <module-name> [options]
  nl generate controller <controller-name> --module <module-name> [options]
  nl generate resolver <resolver-name> --module <module-name> [options]
  nl generate model <model-name> --module <module-name> [options]
  nl generate lib <lib-name> [options]
  nl g module <module-name> [options]
  nl g service <service-name> --module <module-name> [options]
  nl g controller <controller-name> --module <module-name> [options]
  nl g resolver <resolver-name> --module <module-name> [options]
  nl g model <model-name> --module <module-name> [options]
  nl g lib <lib-name> [options]

Commands:
  new                           Scaffold a new Bun-native Nael Framework service
  generate module, g module     Scaffold a feature module under ./src/modules
  generate service, g service   Add a provider inside an existing module
  generate controller, g controller Create an HTTP controller inside an existing module
  generate resolver, g resolver Register a GraphQL resolver inside an existing module
  generate model, g model       Create a GraphQL object model inside an existing module
  generate lib, g lib           Scaffold a reusable Bun-native library under ./libs

Options:
  --install         Run "bun install" after scaffolding
    --module, -m      Target module name when generating services, controllers, resolvers, or models
  --force, -f       Overwrite existing files in the target directory
  --help            Display this help message
  --version, -v     Show the CLI version
`);
};

interface ParsedArguments {
  command?: string;
  positionals: string[];
  flags: Map<string, string | boolean>;
}

const parseArguments = (argv: string[]): ParsedArguments => {
  const [, , ...rest] = argv;

  const flags = new Map<string, string | boolean>();
  const positionals: string[] = [];

  for (let i = 0; i < rest.length; i++) {
    const value = rest[i];
    if (typeof value !== 'string') {
      continue;
    }

    if (value.startsWith('--')) {
      const equalsIndex = value.indexOf('=');
      const flag = equalsIndex === -1 ? value : value.slice(0, equalsIndex);
      if (!flag) {
        continue;
      }

      if (equalsIndex !== -1) {
        const inlineValue = value.slice(equalsIndex + 1);
        flags.set(flag, inlineValue);
        continue;
      }

      const next = rest[i + 1];
      if (typeof next === 'string' && !next.startsWith('-')) {
        flags.set(flag, next);
        i += 1;
      } else {
        flags.set(flag, true);
      }
      continue;
    }

    if (value.startsWith('-') && value !== '-') {
      if (value.length > 2) {
        const cluster = value.slice(1);
        for (const char of cluster) {
          flags.set(`-${char}`, true);
        }
      } else {
        const next = rest[i + 1];
        if (typeof next === 'string' && !next.startsWith('-')) {
          flags.set(value, next);
          i += 1;
        } else {
          flags.set(value, true);
        }
      }
      continue;
    }

    positionals.push(value);
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

      const getStringFlag = (name: string): string | undefined => {
        const value = flags.get(name);
        return typeof value === 'string' ? value : undefined;
      };

      const force = flags.has('--force') || flags.has('-f');

      if (target === 'module') {
        const moduleName = positionals[1];
        if (!moduleName) {
          throw new CliError('Please provide a module name, e.g. "nl g module users".');
        }

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
    console.log(`  Add services, controllers, resolvers, or models inside ${relDir}`);
        console.log('  Register the module wherever it should be consumed\n');

        return 0;
      }

      if (target === 'service') {
        const serviceName = positionals[1];
        if (!serviceName) {
          throw new CliError('Please provide a service name, e.g. "nl g service users --module accounts".');
        }

        const moduleName = getStringFlag('--module') ?? getStringFlag('-m') ?? positionals[2];
        if (!moduleName) {
          throw new CliError(
            'Please specify which module to target using --module <name>, e.g. "nl g service users --module accounts".',
          );
        }

        const result = await runGenerateServiceCommand({
          serviceName,
          moduleName,
          force,
        });

        printBanner();
        console.log(`\nService created at ${result.serviceFile}`);

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
        console.log('  Implement service logic in the generated class');
        console.log('  Inject the service into controllers or other providers as needed\n');

        return 0;
      }

      if (target === 'controller') {
        const controllerName = positionals[1];
        if (!controllerName) {
          throw new CliError('Please provide a controller name, e.g. "nl g controller users --module accounts".');
        }

        const moduleName = getStringFlag('--module') ?? getStringFlag('-m') ?? positionals[2];
        if (!moduleName) {
          throw new CliError(
            'Please specify which module to target using --module <name>, e.g. "nl g controller users --module accounts".',
          );
        }

        const result = await runGenerateControllerCommand({
          controllerName,
          moduleName,
          force,
        });

        printBanner();
        console.log(`\nController created at ${result.controllerFile}`);

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
        console.log('  Implement request handlers within the controller');
        console.log('  Wire up routes and services as required\n');

        return 0;
      }

      if (target === 'resolver') {
        const resolverName = positionals[1];
        if (!resolverName) {
          throw new CliError('Please provide a resolver name, e.g. "nl g resolver users --module accounts".');
        }

        const moduleName = getStringFlag('--module') ?? getStringFlag('-m') ?? positionals[2];
        if (!moduleName) {
          throw new CliError(
            'Please specify which module to target using --module <name>, e.g. "nl g resolver users --module accounts".',
          );
        }

        const result = await runGenerateResolverCommand({
          resolverName,
          moduleName,
          force,
        });

        printBanner();
        console.log(`\nResolver created at ${result.resolverFile}`);

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
        console.log('  Implement resolver fields and inject required services');
        console.log('  Ensure the resolver is imported where needed in your GraphQL schema\n');

        return 0;
      }

      if (target === 'model') {
        const modelName = positionals[1];
        if (!modelName) {
          throw new CliError('Please provide a model name, e.g. "nl g model user --module accounts".');
        }

        const moduleName = getStringFlag('--module') ?? getStringFlag('-m') ?? positionals[2];
        if (!moduleName) {
          throw new CliError(
            'Please specify which module to target using --module <name>, e.g. "nl g model user --module accounts".',
          );
        }

        const result = await runGenerateModelCommand({
          modelName,
          moduleName,
          force,
        });

        printBanner();
        console.log(`\nModel created at ${result.modelFile}`);

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
        console.log('  Add additional fields and relationships to the model');
        console.log('  Reference the model from resolvers or services as needed\n');

        return 0;
      }

      if (target === 'lib') {
        const libName = positionals[1];
        if (!libName) {
          throw new CliError('Please provide a library name, e.g. "nl g lib shared-utils".');
        }

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

      throw new CliError(`Unknown generate target: ${target}. Currently supported: module, service, controller, resolver, model, lib`);
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
