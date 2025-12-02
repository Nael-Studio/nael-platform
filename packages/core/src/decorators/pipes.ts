import 'reflect-metadata';
import type { ClassType } from '../interfaces/provider';

const USE_PIPES_METADATA = Symbol.for('nl:pipes:use-pipes');

export interface PipeTransform<TInput = unknown, TOutput = unknown> {
  transform(value: TInput): TOutput | Promise<TOutput>;
}

export type PipeInstanceOrClass =
  | PipeTransform
  | ClassType<PipeTransform>;

export function UsePipes(...pipes: PipeInstanceOrClass[]): MethodDecorator & ClassDecorator {
  return (target: object, propertyKey?: string | symbol) => {
    if (propertyKey) {
      Reflect.defineMetadata(USE_PIPES_METADATA, pipes, target, propertyKey);
    } else {
      Reflect.defineMetadata(USE_PIPES_METADATA, pipes, target);
    }
  };
}

export function getUsePipes(
  target: object,
  propertyKey?: string | symbol,
): PipeInstanceOrClass[] | undefined {
  if (propertyKey) {
    return Reflect.getMetadata(USE_PIPES_METADATA, target, propertyKey) as
      | PipeInstanceOrClass[]
      | undefined;
  }
  return Reflect.getMetadata(USE_PIPES_METADATA, target) as PipeInstanceOrClass[] | undefined;
}
