import 'reflect-metadata';
import type { FilterToken, GuardToken, InterceptorToken, PipeToken } from '@nl-framework/core';
import {
  getAllPipes,
  listAppliedFilters,
  listAppliedGuards,
  listAppliedInterceptors,
} from '@nl-framework/core';
import type { MessagePattern } from '../interfaces/transport';

const MESSAGE_PATTERN_METADATA = Symbol.for('nl:microservices:message-pattern');
const EVENT_PATTERN_METADATA = Symbol.for('nl:microservices:event-pattern');

export interface PatternMetadata {
  pattern: MessagePattern;
  isEvent: boolean;
}

export interface MessageHandlerDefinition {
  propertyKey: string;
  metadata: PatternMetadata;
  guards: GuardToken[];
  interceptors: InterceptorToken[];
  pipes: PipeToken[];
  filters: FilterToken[];
}

export function MessagePattern(pattern: MessagePattern): MethodDecorator {
  return (target: object, propertyKey: string | symbol) => {
    const metadata: PatternMetadata = { pattern, isEvent: false };
    Reflect.defineMetadata(MESSAGE_PATTERN_METADATA, metadata, target, propertyKey);
  };
}

export function EventPattern(pattern: MessagePattern): MethodDecorator {
  return (target: object, propertyKey: string | symbol) => {
    const metadata: PatternMetadata = { pattern, isEvent: true };
    Reflect.defineMetadata(EVENT_PATTERN_METADATA, metadata, target, propertyKey);
  };
}

export function getMessagePatternMetadata(
  target: object,
  propertyKey: string | symbol,
): PatternMetadata | undefined {
  return (
    Reflect.getMetadata(MESSAGE_PATTERN_METADATA, target, propertyKey) ||
    Reflect.getMetadata(EVENT_PATTERN_METADATA, target, propertyKey)
  );
}

export function listMessageHandlers(target: object): MessageHandlerDefinition[] {
  const prototype = typeof target === 'function' ? target.prototype : target;
  const ControllerClass = typeof target === 'function' ? target : target.constructor;
  const handlers: MessageHandlerDefinition[] = [];

  for (const propertyKey of Object.getOwnPropertyNames(prototype)) {
    if (propertyKey === 'constructor') continue;

    const metadata = getMessagePatternMetadata(prototype, propertyKey);
    if (metadata) {
      const guards = ControllerClass ? listAppliedGuards(ControllerClass, propertyKey) : [];
      const interceptors = ControllerClass ? listAppliedInterceptors(ControllerClass, propertyKey) : [];
      const pipes = getAllPipes(prototype, propertyKey);
      const filters = ControllerClass ? listAppliedFilters(ControllerClass, propertyKey) : [];

      handlers.push({ propertyKey, metadata, guards, interceptors, pipes, filters });
    }
  }

  return handlers;
}
