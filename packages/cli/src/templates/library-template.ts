import type { TemplateFile } from './project-template';
import { createModuleTemplate } from './module-template';

export interface LibraryTemplateContext {
  libraryName: string;
  packageName: string;
  bunVersion: string;
  moduleDirName: string;
  moduleClassName: string;
}

const createPackageJson = (ctx: LibraryTemplateContext): string =>
  `${JSON.stringify(
    {
      name: ctx.packageName,
      version: '0.0.1',
      description: 'Shareable library generated with the Nael Framework CLI.',
      type: 'module',
      packageManager: `bun@${ctx.bunVersion}`,
      exports: {
        '.': {
          import: './dist/index.js',
          types: './dist/index.d.ts',
        }
      },
      files: ['dist'],
      scripts: {
        build: 'bunx tsc --project tsconfig.json',
        check: 'bunx tsc --noEmit',
        test: 'bun test'
      },
      devDependencies: {
        typescript: '^5.5.2',
        'bun-types': `^${ctx.bunVersion}`
      }
    },
    null,
    2
  )}\n`;

const tsconfigJson = `{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "rootDir": "src",
    "outDir": "dist",
    "types": ["bun-types"]
  },
  "include": ["src/**/*"],
  "exclude": ["dist", "tests", "node_modules"]
}
`;

const gitignore = `node_modules
dist
bun.lockb
.DS_Store
`;

const srcIndex = `export * from './modules';
`;

const modulesIndex = (ctx: LibraryTemplateContext): string => `export * from './${ctx.moduleDirName}';
`;

const readme = (ctx: LibraryTemplateContext) => `# ${ctx.libraryName}

Generated with the Nael Framework CLI. This library exports feature modules that can be consumed by your Nael services or other libraries.

## Build

\`\`\`bash
bun run build
\`\`\`

## Structure

- \`src/modules/${ctx.moduleDirName}/${ctx.moduleDirName}.module.ts\` — Declares the \`${ctx.moduleClassName}\` feature module.
- \`src/modules/${ctx.moduleDirName}/controllers\`, \`services\`, \`resolvers\` — Ready for future generators.
- \`src/index.ts\` — Re-exports modules for consumers.

## Usage

\`\`\`ts
import { ${ctx.moduleClassName} } from '${ctx.packageName}';

// Register ${ctx.moduleClassName} inside your service or gateway as needed.
\`\`\`

## Adding more modules

Run \`nl g module <name>\` inside this library to scaffold additional modules. Future updates will also support generating services, controllers, and resolvers within each module.
`;

export const createLibraryTemplate = (ctx: LibraryTemplateContext): TemplateFile[] => [
  { path: 'package.json', contents: createPackageJson(ctx) },
  { path: 'tsconfig.json', contents: tsconfigJson },
  { path: '.gitignore', contents: gitignore },
  { path: 'README.md', contents: readme(ctx) },
  { path: 'src/index.ts', contents: srcIndex },
  { path: 'src/modules/index.ts', contents: modulesIndex(ctx) },
  ...createModuleTemplate({
    baseDir: 'src/modules',
    moduleDirName: ctx.moduleDirName,
    moduleClassName: ctx.moduleClassName,
  }),
];