import 'reflect-metadata';
import { isStage3ClassContext, isStage3MethodContext } from './metadata-helpers';
const GUARDS_METADATA_KEY = Symbol.for('nl:http:guards:metadata');
const defineGuardMetadata = (target, value, propertyKey) => {
    if (propertyKey !== undefined) {
        Reflect.defineMetadata(GUARDS_METADATA_KEY, value, target, propertyKey);
        return;
    }
    Reflect.defineMetadata(GUARDS_METADATA_KEY, value, target);
};
const readGuardMetadata = (target, propertyKey) => {
    const existing = (propertyKey !== undefined
        ? Reflect.getMetadata(GUARDS_METADATA_KEY, target, propertyKey)
        : Reflect.getMetadata(GUARDS_METADATA_KEY, target)) ?? [];
    return existing.length ? [...existing] : [];
};
const appendGuardMetadata = (target, guards, propertyKey) => {
    if (!guards.length) {
        return;
    }
    const existing = readGuardMetadata(target, propertyKey);
    const next = existing.length ? [...existing, ...guards] : [...guards];
    defineGuardMetadata(target, next, propertyKey);
};
export const UseGuards = (...guards) => ((targetOrValue, context) => {
    if (isStage3MethodContext(context)) {
        context.addInitializer(function () {
            const container = context.static ? this : Object.getPrototypeOf(this);
            if (!container) {
                return;
            }
            appendGuardMetadata(container, guards, context.name);
        });
        return targetOrValue;
    }
    if (isStage3ClassContext(context)) {
        context.addInitializer(function () {
            appendGuardMetadata(this, guards);
        });
        return targetOrValue;
    }
    if (typeof context === 'undefined') {
        appendGuardMetadata(targetOrValue, guards);
        return targetOrValue;
    }
    appendGuardMetadata(targetOrValue, guards, context);
    return targetOrValue;
});
export const getGuardMetadata = (target, propertyKey) => readGuardMetadata(target, propertyKey);
export const listAppliedGuards = (controller, handlerName) => {
    const guards = [];
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
            const metadata = readGuardMetadata(current, propertyKey);
            if (metadata.length) {
                guards.push(...metadata);
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
    return dedupe(guards);
};
export { GUARDS_METADATA_KEY };
//# sourceMappingURL=guards.js.map