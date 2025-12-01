import { METADATA_KEYS } from '../constants';
import { setMetadata, getMetadata } from '../utils/metadata';
import { Scope } from '../scope';

export interface InjectableOptions {
  scope?: Scope;
}

export interface InjectableMetadata {
  scope: Scope;
}

export const Injectable = (options: InjectableOptions = {}): ClassDecorator => (target) => {
  const metadata: InjectableMetadata = {
    scope: options.scope ?? Scope.SINGLETON,
  };
  setMetadata(METADATA_KEYS.injectable, metadata, target);
};

export const isInjectable = (target: unknown): target is Function =>
  Boolean(target && getMetadata(METADATA_KEYS.injectable, target));

export const getInjectableMetadata = (target: unknown): InjectableMetadata | undefined => {
  const metadata = target ? (getMetadata(METADATA_KEYS.injectable, target) as InjectableMetadata | undefined) : undefined;
  if (!metadata) {
    return undefined;
  }
  return {
    scope: metadata.scope ?? Scope.SINGLETON,
  };
};
