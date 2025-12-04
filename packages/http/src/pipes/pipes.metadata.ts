import {
  UsePipes as CoreUsePipes,
  setPipeMetadata as coreSetPipeMetadata,
  getHandlerPipes as coreGetHandlerPipes,
  getParamPipes as coreGetParamPipes,
  getAllPipes as coreGetAllPipes,
} from '@nl-framework/core';
import type { PipeToken } from './pipe-transform.interface';

export const UsePipes = (...pipes: PipeToken[]): MethodDecorator & ClassDecorator =>
  CoreUsePipes(...pipes);

export const setPipeMetadata = (
  target: object,
  propertyKey: string | symbol,
  paramIndex: number,
  pipes: PipeToken[],
): void => {
  coreSetPipeMetadata(target, propertyKey, paramIndex, pipes);
};

export const getHandlerPipes = (
  target: object,
  propertyKey: string | symbol,
): PipeToken[] => coreGetHandlerPipes(target, propertyKey) as PipeToken[];

export const getParamPipes = (
  target: object,
  propertyKey: string | symbol,
  paramIndex: number,
): PipeToken[] => coreGetParamPipes(target, propertyKey, paramIndex) as PipeToken[];

export const getAllPipes = (
  target: object,
  propertyKey: string | symbol,
  paramIndex?: number,
): PipeToken[] => coreGetAllPipes(target, propertyKey, paramIndex) as PipeToken[];
