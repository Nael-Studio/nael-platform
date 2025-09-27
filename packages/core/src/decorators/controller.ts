import { METADATA_KEYS } from '../constants';
import { setMetadata, getMetadata } from '../utils/metadata';
import type { ClassType } from '../interfaces/provider';

export const Controller = (prefix = ''): ClassDecorator => (target) => {
  setMetadata(METADATA_KEYS.controller, prefix, target);
};

export const getControllerPrefix = (target: ClassType): string =>
  (getMetadata(METADATA_KEYS.controller, target) as string) ?? '';
