import 'reflect-metadata';
import { isStage3ClassContext, isStage3MethodContext } from './metadata-helpers';
const PIPES_METADATA_KEY = Symbol.for('nl:http:pipes');
const PARAM_PIPES_METADATA_KEY = Symbol.for('nl:http:param-pipes');
const defineHandlerPipes = (target, pipes, propertyKey) => {
    if (propertyKey !== undefined) {
        Reflect.defineMetadata(PIPES_METADATA_KEY, pipes, target, propertyKey);
        return;
    }
    Reflect.defineMetadata(PIPES_METADATA_KEY, pipes, target);
};
const readHandlerPipes = (target, propertyKey) => {
    const methodPipes = Reflect.getMetadata(PIPES_METADATA_KEY, target, propertyKey);
    const classTarget = typeof target === 'function' ? target : target.constructor;
    const classPipes = classTarget
        ? Reflect.getMetadata(PIPES_METADATA_KEY, classTarget)
        : undefined;
    return [...(classPipes ?? []), ...(methodPipes ?? [])];
};
export const UsePipes = (...pipes) => ((targetOrValue, context) => {
    if (isStage3MethodContext(context)) {
        context.addInitializer(function () {
            const container = context.static ? this : Object.getPrototypeOf(this);
            if (!container) {
                return;
            }
            defineHandlerPipes(container, pipes, context.name);
        });
        return targetOrValue;
    }
    if (isStage3ClassContext(context)) {
        context.addInitializer(function () {
            defineHandlerPipes(this, pipes);
        });
        return targetOrValue;
    }
    if (typeof context === 'undefined') {
        defineHandlerPipes(targetOrValue, pipes);
        return targetOrValue;
    }
    defineHandlerPipes(targetOrValue, pipes, context);
    return targetOrValue;
});
export const setPipeMetadata = (target, propertyKey, paramIndex, pipes) => {
    const existing = Reflect.getMetadata(PARAM_PIPES_METADATA_KEY, target, propertyKey);
    const pipeMap = existing ?? new Map();
    pipeMap.set(paramIndex, pipes);
    Reflect.defineMetadata(PARAM_PIPES_METADATA_KEY, pipeMap, target, propertyKey);
};
export const getHandlerPipes = (target, propertyKey) => readHandlerPipes(target, propertyKey);
export const getParamPipes = (target, propertyKey, paramIndex) => {
    const pipeMap = Reflect.getMetadata(PARAM_PIPES_METADATA_KEY, target, propertyKey);
    return pipeMap?.get(paramIndex) ?? [];
};
export const getAllPipes = (target, propertyKey, paramIndex) => {
    const handlerPipes = getHandlerPipes(target, propertyKey);
    if (paramIndex !== undefined) {
        const paramPipes = getParamPipes(target, propertyKey, paramIndex);
        return [...handlerPipes, ...paramPipes];
    }
    return handlerPipes;
};
export { PIPES_METADATA_KEY, PARAM_PIPES_METADATA_KEY };
//# sourceMappingURL=pipes.js.map