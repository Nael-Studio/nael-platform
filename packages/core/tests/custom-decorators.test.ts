import 'reflect-metadata';
import { describe, it, expect } from 'bun:test';
import { SetMetadata } from '@nl-framework/core';

const Roles = (...roles: string[]) => SetMetadata('roles', roles);

describe('SetMetadata', () => {
  it('attaches metadata to classes and methods', () => {
    @Roles('admin')
    class SecuredResource {
      @Roles('viewer')
      stats() {
        return 'stats';
      }
    }

    expect(Reflect.getMetadata('roles', SecuredResource)).toEqual(['admin']);
    expect(Reflect.getMetadata('roles', SecuredResource.prototype, 'stats')).toEqual(['viewer']);
  });
});
