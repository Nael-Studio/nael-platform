import {
  UseGuards as CoreUseGuards,
  getGuardMetadata as coreGetGuardMetadata,
  listAppliedGuards as coreListAppliedGuards,
  GUARDS_METADATA_KEY,
} from '@nl-framework/core';
import type { GuardToken } from './types';
import { markGuardToken } from './utils';

export const UseGuards = (...guards: GuardToken[]): ClassDecorator & MethodDecorator => {
  for (const guard of guards) {
    markGuardToken(guard);
  }
  return CoreUseGuards(...guards);
};

export const getGuardMetadata = (target: object, propertyKey?: string | symbol): GuardToken[] =>
  coreGetGuardMetadata(target, propertyKey) as GuardToken[];

export const listAppliedGuards = (
  controller: object,
  handlerName?: string | symbol,
): GuardToken[] => coreListAppliedGuards<GuardToken>(controller, handlerName);

export const HTTP_GUARDS_METADATA_KEY = GUARDS_METADATA_KEY;
