import { describe, expect, it } from 'bun:test';
import {
  SetMetadata,
  UseFilters,
  UseGuards,
  UseInterceptors,
  UsePipes,
  getGuardMetadata,
  getInterceptorMetadata,
  listAppliedGuards,
} from '../src/index';

/**
 * Regression test: a legacy method decorator must never return the prototype
 * (which the runtime would misread as a property descriptor and clobber the
 * method). This is especially destructive for methods named `get`/`set`, whose
 * names collide with accessor descriptor keys, turning the method into an
 * accessor that runs on property access. See core decorators' legacy branch.
 */

const guard = () => true;
const interceptor = async (_c: unknown, next: { handle(): Promise<unknown> }) => next.handle();
class Pipe {
  transform(v: unknown) {
    return v;
  }
}
class Filter {
  catch() {
    return 'handled';
  }
}

class Resource {
  // Method literally named `get` with a full decorator stack.
  @UseGuards(guard)
  @UseInterceptors(interceptor)
  @UsePipes(Pipe)
  @UseFilters(Filter)
  @SetMetadata('role', 'reader')
  get(id: number) {
    return `got:${id}`;
  }

  // And `set`, the other accessor-key collision.
  @UseGuards(guard)
  set(value: number) {
    return `set:${value}`;
  }
}

describe('decorator method preservation', () => {
  it('keeps a stacked-decorator method named `get` callable', () => {
    const instance = new Resource();
    expect(typeof instance.get).toBe('function');
    expect(instance.get(7)).toBe('got:7');
  });

  it('keeps a decorated method named `set` callable', () => {
    const instance = new Resource();
    expect(typeof instance.set).toBe('function');
    expect(instance.set(3)).toBe('set:3');
  });

  it('still records all decorator metadata for the `get` handler', () => {
    expect(listAppliedGuards(Resource, 'get')).toContain(guard);
    expect(getGuardMetadata(Resource.prototype, 'get')).toContain(guard);
    expect(getInterceptorMetadata(Resource.prototype, 'get')).toContain(interceptor);
  });
});
