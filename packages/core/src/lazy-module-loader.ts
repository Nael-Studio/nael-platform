import { Injectable } from './decorators/injectable';
import type { ClassType } from './interfaces/provider';
import { ModuleManager, type ModuleLoadResult } from './module-manager';

type ModuleLike = ClassType | { default: ClassType };
type ModuleFactory = () => Promise<ModuleLike> | ModuleLike;

@Injectable()
export class LazyModuleLoader {
  constructor(private readonly moduleManager: ModuleManager) { }

  async load(moduleOrFactory: ClassType | ModuleLike | ModuleFactory): Promise<ModuleLoadResult> {
    const moduleClass = await this.resolveModuleClass(moduleOrFactory);
    return this.moduleManager.loadModule(moduleClass);
  }

  private async resolveModuleClass(input: ClassType | ModuleLike | ModuleFactory): Promise<ClassType> {
    if (this.looksLikeModuleClass(input)) {
      return input as ClassType;
    }

    const factory = input as ModuleFactory;
    const produced = await Promise.resolve(typeof factory === 'function' ? factory() : factory);

    if (this.looksLikeModuleClass(produced)) {
      return produced as ClassType;
    }

    if (produced && typeof produced === 'object' && 'default' in produced && this.looksLikeModuleClass(produced.default)) {
      return produced.default as ClassType;
    }

    throw new Error('LazyModuleLoader.load() expected a module class or a factory returning one.');
  }

  private looksLikeModuleClass(input: unknown): input is ClassType {
    return typeof input === 'function' && typeof (input as { prototype?: unknown }).prototype === 'object';
  }
}
