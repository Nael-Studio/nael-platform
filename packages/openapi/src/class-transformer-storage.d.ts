/**
 * Ambient typing for class-transformer's internal metadata storage subpath.
 * We read `@Type(() => X)` hints to resolve the item type of nested arrays,
 * where `design:type` only reports `Array`. This mirrors how other OpenAPI
 * generators (e.g. @nestjs/swagger) recover element types. Referenced from
 * class-to-json-schema.ts via a `/// <reference>` directive so it is always
 * in-program, even when consumers compile this source directly.
 */
declare module 'class-transformer/cjs/storage' {
  interface TypeMetadata {
    typeFunction: (...args: unknown[]) => unknown;
  }
  interface DefaultMetadataStorage {
    findTypeMetadata(target: Function, propertyName: string): TypeMetadata | undefined;
  }
  export const defaultMetadataStorage: DefaultMetadataStorage;
}
