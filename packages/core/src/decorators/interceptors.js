import 'reflect-metadata';
import { isStage3ClassContext, isStage3MethodContext } from './metadata-helpers';
const INTERCEPTORS_METADATA_KEY = Symbol.for('nl:http:interceptors:metadata');
const defineInterceptorMetadata = (target, value, propertyKey) => {
    if (propertyKey !== undefined) {
        Reflect.defineMetadata(INTERCEPTORS_METADATA_KEY, value, target, propertyKey);
        return;
    }
    Reflect.defineMetadata(INTERCEPTORS_METADATA_KEY, value, target);
};
const readInterceptorMetadata = (target, propertyKey) => {
    const existing = (propertyKey !== undefined
        ? Reflect.getMetadata(INTERCEPTORS_METADATA_KEY, target, propertyKey)
        : Reflect.getMetadata(INTERCEPTORS_METADATA_KEY, target)) ?? [];
    return existing.length ? [...existing] : [];
};
const appendInterceptorMetadata = (target, interceptors, propertyKey) => {
    if (!interceptors.length) {
        return;
    }
    const existing = readInterceptorMetadata(target, propertyKey);
    const next = existing.length ? [...existing, ...interceptors] : [...interceptors];
    defineInterceptorMetadata(target, next, propertyKey);
};
export const UseInterceptors = (...interceptors) => ((targetOrValue, context) => {
    if (isStage3MethodContext(context)) {
        context.addInitializer(function () {
            const container = context.static ? this : Object.getPrototypeOf(this);
            if (!container) {
                return;
            }
            appendInterceptorMetadata(container, interceptors, context.name);
        });
        return targetOrValue;
    }
    if (isStage3ClassContext(context)) {
        context.addInitializer(function () {
            appendInterceptorMetadata(this, interceptors);
        });
        return targetOrValue;
    }
    if (typeof context === 'undefined') {
        appendInterceptorMetadata(targetOrValue, interceptors);
        return targetOrValue;
    }
    appendInterceptorMetadata(targetOrValue, interceptors, context);
    return targetOrValue;
});
export const getInterceptorMetadata = (target, propertyKey) => readInterceptorMetadata(target, propertyKey);
export const listAppliedInterceptors = (controller, handlerName) => {
    const interceptors = [];
    const dedupe = (items) => {
        const result = [];
        const seen = new Set();
        for (const item of items) {
            if (!seen.has(item)) {
                seen.add(item);
                result.push(item);
            }
        }
        return result;
    };
    const appendFromTarget = (target, propertyKey) => {
        if (!target) {
            return;
        }
        const visited = new Set();
        let current = target;
        while (current && !visited.has(current)) {
            visited.add(current);
            const metadata = readInterceptorMetadata(current, propertyKey);
            if (metadata.length) {
                interceptors.push(...metadata);
            }
            current = Object.getPrototypeOf(current);
        }
    };
    if (typeof controller === 'function') {
        appendFromTarget(controller);
        if ('prototype' in controller) {
            appendFromTarget(controller.prototype);
        }
        if (handlerName !== undefined) {
            appendFromTarget(controller, handlerName);
            if ('prototype' in controller) {
                appendFromTarget(controller.prototype, handlerName);
            }
        }
    }
    else if (controller && typeof controller === 'object') {
        appendFromTarget(controller);
        if (handlerName !== undefined) {
            appendFromTarget(controller, handlerName);
        }
    }
    return dedupe(interceptors);
};
export { INTERCEPTORS_METADATA_KEY };
//# sourceMappingURL=interceptors.js.map