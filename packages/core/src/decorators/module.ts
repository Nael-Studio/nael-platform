import { METADATA_KEYS } from '../constants.js';
import { setMetadata, getMetadata } from '../utils/metadata.js';
import type { ModuleMetadata } from '../interfaces/module.js';
import type { ClassType } from '../interfaces/provider.js';

const defaultMetadata: Required<ModuleMetadata> = {
  imports: [],
  providers: [],
  controllers: [],
  exports: [],
};

export const Module = (metadata: ModuleMetadata): ClassDecorator => (target) => {
  setMetadata(METADATA_KEYS.module, { ...defaultMetadata, ...metadata }, target);
};

export const getModuleMetadata = (target: ClassType): Required<ModuleMetadata> =>
  (getMetadata(METADATA_KEYS.module, target) as Required<ModuleMetadata>) ?? { ...defaultMetadata };
