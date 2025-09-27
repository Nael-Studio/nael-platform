import { METADATA_KEYS } from '../constants';
import { setMetadata, getMetadata } from '../utils/metadata';
import type { ModuleMetadata } from '../interfaces/module';
import type { ClassType } from '../interfaces/provider';

const defaultMetadata: Required<ModuleMetadata> = {
  imports: [],
  providers: [],
  controllers: [],
  resolvers: [],
  exports: [],
};

export const Module = (metadata: ModuleMetadata): ClassDecorator => (target) => {
  setMetadata(METADATA_KEYS.module, { ...defaultMetadata, ...metadata }, target);
};

export const getModuleMetadata = (target: ClassType): Required<ModuleMetadata> =>
  (getMetadata(METADATA_KEYS.module, target) as Required<ModuleMetadata>) ?? { ...defaultMetadata };
