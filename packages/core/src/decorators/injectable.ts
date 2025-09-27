import { METADATA_KEYS } from '../constants';
import { setMetadata, getMetadata } from '../utils/metadata';

export const Injectable = (): ClassDecorator => (target) => {
  setMetadata(METADATA_KEYS.injectable, true, target);
};

export const isInjectable = (target: unknown): target is Function =>
  Boolean(target && getMetadata(METADATA_KEYS.injectable, target));
