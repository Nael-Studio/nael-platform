import 'reflect-metadata';
export type GuardToken = unknown;
declare const GUARDS_METADATA_KEY: unique symbol;
export declare const UseGuards: (...guards: GuardToken[]) => ClassDecorator & MethodDecorator;
export declare const getGuardMetadata: (target: object, propertyKey?: string | symbol) => GuardToken[];
export declare const listAppliedGuards: <T = GuardToken>(controller: object, handlerName?: string | symbol) => T[];
export { GUARDS_METADATA_KEY };
//# sourceMappingURL=guards.d.ts.map