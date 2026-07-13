import { describe, expect, it } from 'bun:test';
import { classToJsonSchema, createSchemaRegistry, registerDtoSchema } from '../src';
import { AddressDto, CreateUserDto, UserRole } from './fixtures/sample-api';

describe('classToJsonSchema', () => {
  it('derives scalar types, formats, and constraints from class-validator metadata', () => {
    const registry = createSchemaRegistry();
    const schema = classToJsonSchema(CreateUserDto, registry);

    expect(schema.type).toBe('object');
    const props = schema.properties!;

    expect(props.name).toMatchObject({ type: 'string', minLength: 2, maxLength: 50 });
    expect(props.email).toMatchObject({ type: 'string', format: 'email' });
    expect(props.age).toMatchObject({ type: 'integer', minimum: 0, maximum: 120 });
  });

  it('maps @IsEnum to an enum with inferred type', () => {
    const schema = classToJsonSchema(CreateUserDto);
    expect(schema.properties!.role).toMatchObject({
      type: 'string',
      enum: [UserRole.Admin, UserRole.User],
    });
  });

  it('drops @IsOptional properties from required', () => {
    const schema = classToJsonSchema(CreateUserDto);
    expect(schema.required).toContain('name');
    expect(schema.required).toContain('email');
    expect(schema.required).not.toContain('age');
    expect(schema.required).not.toContain('tags');
  });

  it('wraps `each` validators in an array of item schemas', () => {
    const schema = classToJsonSchema(CreateUserDto);
    expect(schema.properties!.tags).toMatchObject({
      type: 'array',
      items: { type: 'string' },
    });
  });

  it('references nested DTOs via $ref and registers them in components', () => {
    const registry = createSchemaRegistry();
    classToJsonSchema(CreateUserDto, registry);

    expect(registry.schemas.AddressDto).toBeDefined();
    expect(registry.schemas.AddressDto.properties!.street).toMatchObject({ type: 'string' });
  });

  it('registerDtoSchema is idempotent and cycle-safe', () => {
    const registry = createSchemaRegistry();
    const a = registerDtoSchema(AddressDto, registry);
    const b = registerDtoSchema(AddressDto, registry);
    expect(a).toBe('AddressDto');
    expect(b).toBe('AddressDto');
    expect(Object.keys(registry.schemas)).toEqual(['AddressDto']);
  });
});
