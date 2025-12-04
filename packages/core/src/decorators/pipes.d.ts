import 'reflect-metadata';
export type PipeToken = unknown;
declare const PIPES_METADATA_KEY: unique symbol;
declare const PARAM_PIPES_METADATA_KEY: unique symbol;
export declare const UsePipes: (...pipes: PipeToken[]) => ClassDecorator & MethodDecorator;
export declare const setPipeMetadata: (target: object, propertyKey: string | symbol, paramIndex: number, pipes: PipeToken[]) => void;
export declare const getHandlerPipes: (target: object, propertyKey: string | symbol) => PipeToken[];
export declare const getParamPipes: (target: object, propertyKey: string | symbol, paramIndex: number) => PipeToken[];
export declare const getAllPipes: (target: object, propertyKey: string | symbol, paramIndex?: number) => PipeToken[];
export { PIPES_METADATA_KEY, PARAM_PIPES_METADATA_KEY };
//# sourceMappingURL=pipes.d.ts.map