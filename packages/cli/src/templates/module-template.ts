import type { TemplateFile } from './project-template';

export interface ModuleTemplateContext {
  baseDir: string;
  moduleDirName: string;
  moduleClassName: string;
}

const moduleIndex = (ctx: ModuleTemplateContext): string => `export * from './${ctx.moduleDirName}.module';\n`;

const moduleDefinition = (ctx: ModuleTemplateContext): string => `import { Module } from '@nl-framework/core';\n\n@Module({\n  imports: [],\n  controllers: [],\n  providers: [],\n})\nexport class ${ctx.moduleClassName} {}\n`;

export const createModuleTemplate = (ctx: ModuleTemplateContext): TemplateFile[] => [
  { path: `${ctx.baseDir}/${ctx.moduleDirName}/index.ts`, contents: moduleIndex(ctx) },
  { path: `${ctx.baseDir}/${ctx.moduleDirName}/${ctx.moduleDirName}.module.ts`, contents: moduleDefinition(ctx) },
  { path: `${ctx.baseDir}/${ctx.moduleDirName}/controllers/.gitkeep`, contents: '' },
  { path: `${ctx.baseDir}/${ctx.moduleDirName}/services/.gitkeep`, contents: '' },
  { path: `${ctx.baseDir}/${ctx.moduleDirName}/resolvers/.gitkeep`, contents: '' },
  { path: `${ctx.baseDir}/${ctx.moduleDirName}/models/.gitkeep`, contents: '' },
];