import { describe, expect, it } from 'bun:test';
import { UseFilters, UseGuards, UseInterceptors, UsePipes } from '@nl-framework/core';
import { MessagePattern, EventPattern, listMessageHandlers } from '../src/decorators/patterns';

class TestController {
  @MessagePattern('test.message')
  handleMessage() {
    return 'handled';
  }

  @EventPattern('test.event')
  handleEvent() {
    // no-op
  }

  regularMethod() {
    return 'not a handler';
  }
}

@UseGuards('classGuard')
@UseInterceptors('classInterceptor')
@UsePipes('classPipe')
@UseFilters('classFilter')
class DecoratedController {
  @MessagePattern('decorated')
  @UseGuards('methodGuard')
  @UseInterceptors('methodInterceptor')
  @UsePipes('methodPipe')
  @UseFilters('methodFilter')
  handle(): void {}
}

describe('Message Pattern Decorators', () => {
  it('registers message patterns on methods', () => {
    const handlers = listMessageHandlers(TestController);

    expect(handlers).toHaveLength(2);
    expect(handlers[0]?.propertyKey).toBe('handleMessage');
    expect(handlers[0]?.metadata.pattern).toBe('test.message');
    expect(handlers[0]?.metadata.isEvent).toBe(false);
  });

  it('registers event patterns on methods', () => {
    const handlers = listMessageHandlers(TestController);
    const eventHandler = handlers.find(h => h.propertyKey === 'handleEvent');

    expect(eventHandler).toBeDefined();
    expect(eventHandler?.metadata.pattern).toBe('test.event');
    expect(eventHandler?.metadata.isEvent).toBe(true);
  });

  it('ignores methods without decorators', () => {
    const handlers = listMessageHandlers(TestController);
    const regularHandler = handlers.find(h => h.propertyKey === 'regularMethod');

    expect(regularHandler).toBeUndefined();
  });

  it('captures guard/interceptor/pipe/filter metadata for handlers', () => {
    const handlers = listMessageHandlers(DecoratedController);
    const handler = handlers.find(h => h.propertyKey === 'handle');

    expect(handler).toBeDefined();
    expect(handler?.guards).toEqual(['classGuard', 'methodGuard']);
    expect(handler?.interceptors).toEqual(['classInterceptor', 'methodInterceptor']);
    expect(handler?.pipes).toEqual(['classPipe', 'methodPipe']);
    expect(handler?.filters).toEqual(['methodFilter', 'classFilter']);
  });
});
