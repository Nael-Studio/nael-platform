import { METADATA_KEYS } from '../constants.js';
import { setMetadata, getMetadata } from '../utils/metadata.js';
import type { ClassType } from '../interfaces/provider.js';

export const Controller = (prefix = ''): ClassDecorator => (target) => {
  setMetadata(METADATA_KEYS.controller, prefix, target);
};

export const getControllerPrefix = (target: ClassType): string =>
  (getMetadata(METADATA_KEYS.controller, target) as string) ?? '';
