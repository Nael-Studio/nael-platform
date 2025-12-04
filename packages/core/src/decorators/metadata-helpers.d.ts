export type Stage3MethodContext = {
    kind: 'method';
    name: string | symbol;
    static: boolean;
    addInitializer(initializer: (this: unknown) => void): void;
};
export type Stage3ClassContext = {
    kind: 'class';
    addInitializer(initializer: (this: unknown) => void): void;
};
export declare const isStage3MethodContext: (value: unknown) => value is Stage3MethodContext;
export declare const isStage3ClassContext: (value: unknown) => value is Stage3ClassContext;
//# sourceMappingURL=metadata-helpers.d.ts.map