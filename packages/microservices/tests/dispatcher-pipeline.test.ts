import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { UseGuards, UseInterceptors, UsePipes, UseFilters } from '@nl-framework/core';
import { EventPattern, MessagePattern } from '../src/decorators/patterns';
import {
  MessageDispatcher,
  MICROSERVICE_DROP,
} from '../src/dispatcher/message-dispatcher';
import { clearMicroserviceGuards, registerMicroserviceGuard } from '../src/guards/registry';
import {
  clearMicroserviceInterceptors,
  registerMicroserviceInterceptor,
} from '../src/interceptors/registry';
import { clearMicroserviceExceptionFilters } from '../src/filters/registry';
import type { MicroserviceExecutionContext } from '../src/guards/execution-context';
import type { CallHandler } from '../src/interceptors/types';
import type { MicroservicePipeTransform } from '../src/pipes/pipe-transform.interface';
import type { MicroserviceExceptionFilter } from '../src/filters/exception-filter.interface';

// --- shared trace --------------------------------------------------------
const trace: string[] = [];

const allowGuard = (ctx: MicroserviceExecutionContext): boolean => {
  trace.push(`guard:${String(ctx.getPattern())}`);
  return true;
};

const denyGuard = (): boolean => {
  trace.push('guard:deny');
  return false;
};

const traceInterceptor = async (
  _ctx: MicroserviceExecutionContext,
  next: CallHandler,
): Promise<unknown> => {
  trace.push('interceptor:pre');
  const result = await next.handle();
  trace.push('interceptor:post');
  return result;
};

class DoublePipe implements MicroservicePipeTransform<{ n: number }, { n: number }> {
  transform(value: { n: number }): { n: number } {
    trace.push('pipe');
    return { n: value.n * 2 };
  }
}

class ThrowingPipe implements MicroservicePipeTransform {
  transform(): never {
    throw new Error('bad payload');
  }
}

class RecoveringFilter implements MicroserviceExceptionFilter {
  catch(error: Error) {
    return `recovered:${error.message}`;
  }
}

// --- fixtures ------------------------------------------------------------
class OrderController {
  @MessagePattern('order.get')
  @UseGuards(allowGuard)
  @UseInterceptors(traceInterceptor)
  @UsePipes(DoublePipe)
  fetchOrder(payload: { n: number }) {
    trace.push('handler');
    return { doubled: payload.n };
  }

  @EventPattern('order.deleted')
  @UseGuards(denyGuard)
  onDeleted() {
    trace.push('event-handler');
    return 'should-not-run';
  }

  @MessagePattern('order.protected')
  @UseGuards(denyGuard)
  protectedGet() {
    return 'secret';
  }

  @MessagePattern('order.validate')
  @UsePipes(ThrowingPipe)
  @UseFilters(RecoveringFilter)
  validate() {
    trace.push('validate-handler');
    return 'ok';
  }
}

describe('MessageDispatcher pipeline', () => {
  let dispatcher: MessageDispatcher;

  beforeEach(() => {
    trace.length = 0;
    clearMicroserviceGuards();
    clearMicroserviceInterceptors();
    clearMicroserviceExceptionFilters();
    dispatcher = new MessageDispatcher();
    dispatcher.registerController(new OrderController());
  });

  afterEach(() => {
    clearMicroserviceGuards();
    clearMicroserviceInterceptors();
    clearMicroserviceExceptionFilters();
  });

  it('allows a message, transforms the payload with pipes, and returns the result', async () => {
    const result = await dispatcher.dispatch('order.get', { n: 5 });
    expect(result).toEqual({ doubled: 10 });
  });

  it('runs guards → interceptor(pre) → pipes → handler → interceptor(post) in order', async () => {
    registerMicroserviceInterceptor(async (_ctx, next) => {
      trace.push('global-interceptor:pre');
      const r = await next.handle();
      trace.push('global-interceptor:post');
      return r;
    });
    registerMicroserviceGuard((ctx) => {
      trace.push('global-guard');
      return ctx !== undefined;
    });

    await dispatcher.dispatch('order.get', { n: 1 });

    expect(trace).toEqual([
      'global-guard',
      'guard:order.get',
      'global-interceptor:pre',
      'interceptor:pre',
      'pipe',
      'handler',
      'interceptor:post',
      'global-interceptor:post',
    ]);
  });

  it('drops a denied event without calling the handler', async () => {
    const result = await dispatcher.dispatch('order.deleted', { id: 1 });
    expect(result).toEqual(MICROSERVICE_DROP);
    expect(trace).not.toContain('event-handler');
  });

  it('throws a forbidden error for a denied message with no filter', async () => {
    await expect(dispatcher.dispatch('order.protected', {})).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
  });

  it('routes a pipe rejection through the handler exception filters', async () => {
    const result = await dispatcher.dispatch('order.validate', { n: 1 });
    expect(result).toBe('recovered:bad payload');
    expect(trace).not.toContain('validate-handler');
  });
});
