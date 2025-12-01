import type { PipeToken } from './pipe-transform.interface';

const PIPES_METADATA_KEY = Symbol.for('nl:http:pipes');
const PARAM_PIPES_METADATA_KEY = Symbol.for('nl:http:param-pipes');

interface PipeMetadata {
  pipes: PipeToken[];
  scope: 'handler' | 'param';
  paramIndex?: number;
}

export const UsePipes = (...pipes: PipeToken[]): MethodDecorator & ClassDecorator =>
  ((target: any, propertyKey?: string | symbol) => {
    if (propertyKey) {
      // Method decorator
      Reflect.defineMetadata(
        PIPES_METADATA_KEY,
        pipes,
        target,
        propertyKey
      );
    } else {
      // Class decorator
      Reflect.defineMetadata(PIPES_METADATA_KEY, pipes, target);
    }
  }) as MethodDecorator & ClassDecorator;

export const setPipeMetadata = (
  target: object,
  propertyKey: string | symbol,
  paramIndex: number,
  pipes: PipeToken[],
): void => {
  const existing = Reflect.getMetadata(PARAM_PIPES_METADATA_KEY, target, propertyKey) as Map<number, PipeToken[]> | undefined;
  const pipeMap = existing || new Map<number, PipeToken[]>();
  pipeMap.set(paramIndex, pipes);
  Reflect.defineMetadata(PARAM_PIPES_METADATA_KEY, pipeMap, target, propertyKey);
};

export const getHandlerPipes = (
  target: object,
  propertyKey: string | symbol,
): PipeToken[] => {
  const methodPipes = Reflect.getMetadata(PIPES_METADATA_KEY, target, propertyKey) as PipeToken[] | undefined;
  const classPipes = Reflect.getMetadata(PIPES_METADATA_KEY, target.constructor) as PipeToken[] | undefined;

  return [...(classPipes || []), ...(methodPipes || [])];
};

export const getParamPipes = (
  target: object,
  propertyKey: string | symbol,
  paramIndex: number,
): PipeToken[] => {
  const pipeMap = Reflect.getMetadata(PARAM_PIPES_METADATA_KEY, target, propertyKey) as Map<number, PipeToken[]> | undefined;
  return pipeMap?.get(paramIndex) || [];
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
