import { describe, expect, it } from 'bun:test';
import {
  UseGuards,
  listAppliedGuards,
  UseInterceptors,
  listAppliedInterceptors,
  UsePipes,
  getAllPipes,
  setPipeMetadata,
  UseFilters,
  listAppliedFilters,
} from '../src';

describe('Shared Decorators', () => {
  it('collects guards from classes and methods', () => {
    @UseGuards('ClassGuard')
    class BaseController {}

    class GuardedController extends BaseController {
      @UseGuards('MethodGuard')
      handler(): void {}
    }

    const guards = listAppliedGuards<string>(GuardedController, 'handler');
    expect(guards).toEqual(['ClassGuard', 'MethodGuard']);
  });

  it('collects interceptors from inheritance chain', () => {
    @UseInterceptors('ClassInterceptor')
    class BaseInterceptorController {}

    class InterceptorController extends BaseInterceptorController {
      @UseInterceptors('MethodInterceptor')
      handler(): void {}
    }

    const interceptors = listAppliedInterceptors<string>(InterceptorController, 'handler');
    expect(interceptors).toEqual(['ClassInterceptor', 'MethodInterceptor']);
  });

  it('merges handler and parameter pipes', () => {
    @UsePipes('ClassPipe')
    class PipeController {
      @UsePipes('MethodPipe')
      handler(_value: unknown): void {}
    }

    setPipeMetadata(PipeController.prototype, 'handler', 0, ['ParamPipe']);

    const handlerPipes = getAllPipes(PipeController.prototype, 'handler');
    expect(handlerPipes).toEqual(['ClassPipe', 'MethodPipe']);

    const paramPipes = getAllPipes(PipeController.prototype, 'handler', 0);
    expect(paramPipes).toEqual(['ClassPipe', 'MethodPipe', 'ParamPipe']);
  });

  it('deduplicates filters while preserving order', () => {
    const FilterA = Symbol('FilterA');
    const FilterB = Symbol('FilterB');

    @UseFilters(FilterA, FilterB)
    class FilterController {
      @UseFilters(FilterB, FilterA)
      handler(): void {}
    }

    const filters = listAppliedFilters<symbol>(FilterController, 'handler');
    expect(filters).toEqual([FilterB, FilterA]);
  });

  it('prioritizes handler filters ahead of controller filters', () => {
    @UseFilters('ControllerFilter')
    class FilteredController {
      @UseFilters('MethodFilter')
      handler(): void {}
    }

    const filters = listAppliedFilters<string>(FilteredController, 'handler');
    expect(filters).toEqual(['MethodFilter', 'ControllerFilter']);
  });
});
