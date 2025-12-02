import 'reflect-metadata';
import { isStage3ClassContext, isStage3MethodContext } from './metadata-helpers';
const FILTERS_METADATA_KEY = Symbol.for('nl:filters:metadata');
const defineFilterMetadata = (target, value, propertyKey) => {
    if (propertyKey !== undefined) {
        Reflect.defineMetadata(FILTERS_METADATA_KEY, value, target, propertyKey);
        return;
    }
    Reflect.defineMetadata(FILTERS_METADATA_KEY, value, target);
};
const readFilterMetadata = (target, propertyKey) => {
    const existing = (propertyKey !== undefined
        ? Reflect.getMetadata(FILTERS_METADATA_KEY, target, propertyKey)
        : Reflect.getMetadata(FILTERS_METADATA_KEY, target)) ?? [];
    return existing.length ? [...existing] : [];
};
const appendFilterMetadata = (target, filters, propertyKey) => {
    if (!filters.length) {
        return;
    }
    const existing = readFilterMetadata(target, propertyKey);
    const next = existing.length ? [...existing, ...filters] : [...filters];
    defineFilterMetadata(target, next, propertyKey);
};
export const UseFilters = (...filters) => ((targetOrValue, context) => {
    if (isStage3MethodContext(context)) {
        context.addInitializer(function () {
            const container = context.static ? this : Object.getPrototypeOf(this);
            if (!container) {
                return;
            }
            appendFilterMetadata(container, filters, context.name);
        });
        return targetOrValue;
    }
    if (isStage3ClassContext(context)) {
        context.addInitializer(function () {
            appendFilterMetadata(this, filters);
        });
        return targetOrValue;
    }
    if (typeof context === 'undefined') {
        appendFilterMetadata(targetOrValue, filters);
        return targetOrValue;
    }
    appendFilterMetadata(targetOrValue, filters, context);
    return targetOrValue;
});
export const getFilterMetadata = (target, propertyKey) => readFilterMetadata(target, propertyKey);
export const listAppliedFilters = (controller, handlerName) => {
    const filters = [];
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
            const metadata = readFilterMetadata(current, propertyKey);
            if (metadata.length) {
                filters.push(...metadata);
            }
            current = Object.getPrototypeOf(current);
        }
    };
    if (typeof controller === 'function') {
        if (handlerName !== undefined) {
            appendFromTarget(controller, handlerName);
            if ('prototype' in controller) {
                appendFromTarget(controller.prototype, handlerName);
            }
        }
        appendFromTarget(controller);
        if ('prototype' in controller) {
            appendFromTarget(controller.prototype);
        }
    }
    else if (controller && typeof controller === 'object') {
        if (handlerName !== undefined) {
            appendFromTarget(controller, handlerName);
        }
        appendFromTarget(controller);
    }
    return dedupe(filters);
};
export { FILTERS_METADATA_KEY };
//# sourceMappingURL=filters.js.map