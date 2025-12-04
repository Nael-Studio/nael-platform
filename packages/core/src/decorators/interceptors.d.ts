import 'reflect-metadata';
export type InterceptorToken = unknown;
declare const INTERCEPTORS_METADATA_KEY: unique symbol;
type AnyInterceptorToken = InterceptorToken;
export declare const UseInterceptors: (...interceptors: AnyInterceptorToken[]) => ClassDecorator & MethodDecorator;
export declare const getInterceptorMetadata: (target: object, propertyKey?: string | symbol) => AnyInterceptorToken[];
export declare const listAppliedInterceptors: <T = InterceptorToken>(controller: object, handlerName?: string | symbol) => T[];
export { INTERCEPTORS_METADATA_KEY };
//# sourceMappingURL=interceptors.d.ts.map