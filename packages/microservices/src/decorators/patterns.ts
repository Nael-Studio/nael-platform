import 'reflect-metadata';
import type { MessagePattern } from '../interfaces/transport';

const MESSAGE_PATTERN_METADATA = Symbol.for('nl:microservices:message-pattern');
const EVENT_PATTERN_METADATA = Symbol.for('nl:microservices:event-pattern');

export interface PatternMetadata {
  pattern: MessagePattern;
  isEvent: boolean;
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

export function listMessageHandlers(target: object): Array<{ propertyKey: string; metadata: PatternMetadata }> {
  const prototype = typeof target === 'function' ? target.prototype : target;
  const handlers: Array<{ propertyKey: string; metadata: PatternMetadata }> = [];

  for (const propertyKey of Object.getOwnPropertyNames(prototype)) {
    if (propertyKey === 'constructor') continue;

    const metadata = getMessagePatternMetadata(prototype, propertyKey);
    if (metadata) {
      handlers.push({ propertyKey, metadata });
    }
  }

  return handlers;
}
