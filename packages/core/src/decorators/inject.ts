import { METADATA_KEYS } from '../constants';
import { setMetadata, getMetadata } from '../utils/metadata';
import type { Token } from '../interfaces/provider';

export type ParameterInjectionMap = Map<number, Token>;

export const Inject = (token: Token): ParameterDecorator =>
  (target: object, _propertyKey: string | symbol | undefined, parameterIndex: number) => {
    const existing: ParameterInjectionMap =
      (getMetadata(METADATA_KEYS.injectParams, target) as ParameterInjectionMap) ?? new Map();

    existing.set(parameterIndex, token);
    setMetadata(METADATA_KEYS.injectParams, existing, target);
  };

export const getParamInjectionTokens = (target: object | Function): ParameterInjectionMap => {
  const direct = getMetadata(METADATA_KEYS.injectParams, target);
  if (direct) {
    return direct as ParameterInjectionMap;
  }

  if (typeof target === 'function') {
    const fromPrototype = getMetadata(METADATA_KEYS.injectParams, target.prototype);
    if (fromPrototype) {
      return fromPrototype as ParameterInjectionMap;
    }
  }

  return new Map();
};
