import 'reflect-metadata';
export type FilterToken = unknown;
declare const FILTERS_METADATA_KEY: unique symbol;
export declare const UseFilters: (...filters: FilterToken[]) => ClassDecorator & MethodDecorator;
export declare const getFilterMetadata: (target: object, propertyKey?: string | symbol) => FilterToken[];
export declare const listAppliedFilters: <T = FilterToken>(controller: object, handlerName?: string | symbol) => T[];
export { FILTERS_METADATA_KEY };
//# sourceMappingURL=filters.d.ts.map