import {
  UseFilters as CoreUseFilters,
  getFilterMetadata as coreGetFilterMetadata,
  listAppliedFilters as coreListAppliedFilters,
  FILTERS_METADATA_KEY,
  type FilterToken,
} from '@nl-framework/core';

export const UseFilters = (...filters: FilterToken[]): ClassDecorator & MethodDecorator =>
  CoreUseFilters(...filters);

export const getFilterMetadata = (target: object, propertyKey?: string | symbol): FilterToken[] =>
  coreGetFilterMetadata(target, propertyKey);

export const listAppliedFilters = <T = FilterToken>(
  controller: object,
  handlerName?: string | symbol,
): T[] => coreListAppliedFilters<T>(controller, handlerName);

export const HTTP_FILTERS_METADATA_KEY = FILTERS_METADATA_KEY;

