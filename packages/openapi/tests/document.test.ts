import { describe, expect, it } from 'bun:test';
import Ajv from 'ajv';
import { buildOpenApiDocument } from '../src';
import { UsersController, AdminController } from './fixtures/sample-api';
import profileSchema from './fixtures/openapi-3.1-profile.schema.json';

const config = {
  title: 'Sample API',
  version: '1.0.0',
  servers: [{ url: 'https://api.example.com' }],
  securitySchemes: {
    bearer: { type: 'http' as const, scheme: 'bearer' },
  },
};

describe('buildOpenApiDocument', () => {
  it('produces a document that validates against the OpenAPI 3.1 structural profile', () => {
    const doc = buildOpenApiDocument([UsersController, AdminController], config);

    const ajv = new Ajv({ allErrors: true });
    const validate = ajv.compile(profileSchema);
    const valid = validate(doc);
    if (!valid) {
      throw new Error(`Document failed profile validation: ${JSON.stringify(validate.errors, null, 2)}`);
    }
    expect(valid).toBe(true);
    expect(doc.openapi).toBe('3.1.0');
  });

  it('emits an empty-but-valid baseline with zero decorator enrichment', () => {
    const doc = buildOpenApiDocument([], { title: 'Baseline', version: '0.0.0' });
    const ajv = new Ajv({ allErrors: true });
    const validate = ajv.compile(profileSchema);
    expect(validate(doc)).toBe(true);
    expect(doc.paths).toEqual({});
  });

  it('converts :params to {params}, declares path params, and derives the request body', () => {
    const doc = buildOpenApiDocument([UsersController], config);

    expect(doc.paths['/users/{id}']).toBeDefined();
    const findOne = doc.paths['/users/{id}']!.get!;
    const idParam = findOne.parameters!.find((p) => p.name === 'id');
    expect(idParam).toMatchObject({ in: 'path', required: true });

    const create = doc.paths['/users']!.post!;
    expect(create.requestBody!.content['application/json']!.schema).toMatchObject({
      $ref: '#/components/schemas/CreateUserDto',
    });
    // A validated body implies a 400 response.
    expect(create.responses['400']).toBeDefined();
    expect(create.responses['200']!.content!['application/json']!.schema).toMatchObject({
      $ref: '#/components/schemas/UserDto',
    });
  });

  it('places @Version() routes under a version-prefixed path', () => {
    const doc = buildOpenApiDocument([UsersController], config);
    expect(doc.paths['/v2/users']).toBeDefined();
    expect(doc.paths['/v2/users']!.get).toBeDefined();
  });

  it('applies enrichment decorators: operation, response, security, exclude', () => {
    const doc = buildOpenApiDocument([AdminController], config);
    const secret = doc.paths['/admin/secret']!.get!;

    expect(secret.summary).toBe('Admin only');
    expect(secret.deprecated).toBe(true);
    expect(secret.responses['403']).toMatchObject({ description: 'Forbidden' });
    expect(secret.security).toEqual([{ bearer: [] }]);

    // @ApiExcludeEndpoint() hides the operation entirely.
    expect(doc.paths['/admin/hidden']).toBeUndefined();
  });

  it('matches the representative-controller snapshot', () => {
    const doc = buildOpenApiDocument([UsersController], config);
    expect(doc).toMatchSnapshot();
  });
});
