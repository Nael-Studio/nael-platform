import 'reflect-metadata';
import { isStage3ClassContext, isStage3MethodContext } from './metadata-helpers';

export type PipeToken = unknown;

const PIPES_METADATA_KEY = Symbol.for('nl:http:pipes');
const PARAM_PIPES_METADATA_KEY = Symbol.for('nl:http:param-pipes');

const defineHandlerPipes = (
  target: object,
  pipes: PipeToken[],
  propertyKey?: string | symbol,
): void => {
  if (propertyKey !== undefined) {
    Reflect.defineMetadata(PIPES_METADATA_KEY, pipes, target, propertyKey);
    return;
  }
  Reflect.defineMetadata(PIPES_METADATA_KEY, pipes, target);
};

const readHandlerPipes = (target: object, propertyKey: string | symbol): PipeToken[] => {
  const methodPipes = Reflect.getMetadata(PIPES_METADATA_KEY, target, propertyKey) as PipeToken[] | undefined;
  const classTarget = typeof target === 'function' ? target : target.constructor;
  const classPipes = classTarget
    ? (Reflect.getMetadata(PIPES_METADATA_KEY, classTarget) as PipeToken[] | undefined)
    : undefined;

  return [...(classPipes ?? []), ...(methodPipes ?? [])];
};

export const UsePipes = (...pipes: PipeToken[]): ClassDecorator & MethodDecorator =>
  ((targetOrValue: unknown, context?: unknown) => {
    if (isStage3MethodContext(context)) {
      context.addInitializer(function () {
        const container = context.static ? this : Object.getPrototypeOf(this);
        if (!container) {
          return;
        }
        defineHandlerPipes(container as object, pipes, context.name);
      });
      return targetOrValue as PropertyDescriptor['value'];
    }

    if (isStage3ClassContext(context)) {
      context.addInitializer(function () {
        defineHandlerPipes(this as object, pipes);
      });
      return targetOrValue as new (...args: unknown[]) => unknown;
    }

    if (typeof context === 'undefined') {
      defineHandlerPipes(targetOrValue as object, pipes);
      return targetOrValue as ClassDecorator;
    }

    defineHandlerPipes(targetOrValue as object, pipes, context as string | symbol);
    return targetOrValue as PropertyDescriptor['value'];
  }) as ClassDecorator & MethodDecorator;

export const setPipeMetadata = (
  target: object,
  propertyKey: string | symbol,
  paramIndex: number,
  pipes: PipeToken[],
): void => {
  const existing = Reflect.getMetadata(PARAM_PIPES_METADATA_KEY, target, propertyKey) as Map<number, PipeToken[]> | undefined;
  const pipeMap = existing ?? new Map<number, PipeToken[]>();
  pipeMap.set(paramIndex, pipes);
  Reflect.defineMetadata(PARAM_PIPES_METADATA_KEY, pipeMap, target, propertyKey);
};

export const getHandlerPipes = (target: object, propertyKey: string | symbol): PipeToken[] =>
  readHandlerPipes(target, propertyKey);

export const getParamPipes = (
  target: object,
  propertyKey: string | symbol,
  paramIndex: number,
): PipeToken[] => {
  const pipeMap = Reflect.getMetadata(PARAM_PIPES_METADATA_KEY, target, propertyKey) as Map<number, PipeToken[]> | undefined;
  return pipeMap?.get(paramIndex) ?? [];
};

export const getAllPipes = (
  target: object,
  propertyKey: string | symbol,
  paramIndex?: number,
): PipeToken[] => {
  const handlerPipes = getHandlerPipes(target, propertyKey);

  if (paramIndex !== undefined) {
    const paramPipes = getParamPipes(target, propertyKey, paramIndex);
    return [...handlerPipes, ...paramPipes];
  }

  return handlerPipes;
};

export { PIPES_METADATA_KEY, PARAM_PIPES_METADATA_KEY };
