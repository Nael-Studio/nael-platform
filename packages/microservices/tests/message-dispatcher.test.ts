import { beforeEach, describe, expect, it } from 'bun:test';
import { UseFilters } from '@nl-framework/core';
import type { MicroserviceExceptionContext, MicroserviceExceptionFilter } from '../src/filters/exception-filter.interface';
import { MessagePattern } from '../src/decorators/patterns';
import {
  clearMicroserviceExceptionFilters,
  registerMicroserviceExceptionFilter,
} from '../src/filters/registry';
import { MessageDispatcher } from '../src/dispatcher/message-dispatcher';

class CapturingFilter implements MicroserviceExceptionFilter {
  public lastContext?: MicroserviceExceptionContext;
  public lastError?: Error;

  catch(exception: Error, context: MicroserviceExceptionContext) {
    this.lastContext = context;
    this.lastError = exception;
    return 'captured';
  }
}

class LocalFilter implements MicroserviceExceptionFilter {
  catch(exception: Error, _context: MicroserviceExceptionContext) {
    return `local:${exception.message}`;
  }
}

class HandlerWithLocalFilter {
  @MessagePattern('local')
  @UseFilters(LocalFilter)
  handleLocal(): never {
    throw new Error('local error');
  }
}

class HandlerWithoutLocalFilter {
  @MessagePattern('global')
  handleGlobal(): never {
    throw new Error('global error');
  }
}

describe('MessageDispatcher', () => {
  beforeEach(() => {
    clearMicroserviceExceptionFilters();
  });

  it('invokes handler-scoped filters when an exception occurs', async () => {
    const dispatcher = new MessageDispatcher();
    dispatcher.registerController(new HandlerWithLocalFilter());

    const result = await dispatcher.dispatch('local', {});

    expect(result).toBe('local:local error');
  });

  it('falls back to globally registered filters when none are scoped to the handler', async () => {
    const globalFilter = new CapturingFilter();
    registerMicroserviceExceptionFilter(globalFilter);

    const dispatcher = new MessageDispatcher();
    dispatcher.registerController(new HandlerWithoutLocalFilter());

    const result = await dispatcher.dispatch('global', { payload: true });

    expect(result).toBe('captured');
    expect(globalFilter.lastContext?.pattern).toBe('global');
    expect(globalFilter.lastContext?.data).toEqual({ payload: true });
    expect(globalFilter.lastError?.message).toBe('global error');
  });
});
