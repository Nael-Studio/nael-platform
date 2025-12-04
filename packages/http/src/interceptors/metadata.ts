import {
  UseInterceptors as CoreUseInterceptors,
  getInterceptorMetadata as coreGetInterceptorMetadata,
  listAppliedInterceptors as coreListAppliedInterceptors,
  INTERCEPTORS_METADATA_KEY,
} from '@nl-framework/core';
import type { BaseInterceptorToken } from './types';
import { markInterceptorToken } from './utils';

export const UseInterceptors = (
  ...interceptors: BaseInterceptorToken[]
): ClassDecorator & MethodDecorator => {
  for (const interceptor of interceptors) {
    markInterceptorToken(interceptor);
  }
  return CoreUseInterceptors(...interceptors);
};

export const getInterceptorMetadata = (
  target: object,
  propertyKey?: string | symbol,
): BaseInterceptorToken[] => coreGetInterceptorMetadata(target, propertyKey) as BaseInterceptorToken[];

export const listAppliedInterceptors = <C = unknown>(
  controller: object,
  handlerName?: string | symbol,
): BaseInterceptorToken<C>[] => coreListAppliedInterceptors<BaseInterceptorToken<C>>(controller, handlerName);

export const HTTP_INTERCEPTORS_METADATA_KEY = INTERCEPTORS_METADATA_KEY;
