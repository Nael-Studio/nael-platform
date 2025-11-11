import { GraphQLError, GraphQLScalarType, Kind, type ValueNode } from 'graphql';
import { registerScalarType } from './register-scalar-type';

export class ScalarToken {
  constructor(public readonly name: string) {}
}

export const ID = new ScalarToken('ID');
export const Int = new ScalarToken('Int');
export const Float = new ScalarToken('Float');
export const BooleanScalar = new ScalarToken('Boolean');
export const StringScalar = new ScalarToken('String');
export const DateTime = new ScalarToken('DateTime');

const MAX_JSON_LITERAL_DEPTH = 100;

const parseObjectFields = (
  fields: ReadonlyArray<{ name: { value: string }; value: ValueNode }>,
  variables: Record<string, unknown> | null | undefined,
  depth: number,
): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  for (const field of fields) {
    result[field.name.value] = parseJsonLiteral(field.value, variables, depth);
  }
  return result;
};

const parseJsonLiteral = (
  ast: ValueNode,
  variables?: Record<string, unknown> | null,
  depth = 0,
): unknown => {
  if (depth > MAX_JSON_LITERAL_DEPTH) {
    throw new GraphQLError(`JSON literal exceeds maximum depth of ${MAX_JSON_LITERAL_DEPTH}.`);
  }

  switch (ast.kind) {
    case Kind.STRING:
    case Kind.BOOLEAN:
      return ast.value;
    case Kind.INT:
    case Kind.FLOAT:
      return Number(ast.value);
    case Kind.OBJECT:
      return parseObjectFields(ast.fields, variables, depth + 1);
    case Kind.LIST:
      return ast.values.map((value) => parseJsonLiteral(value, variables, depth + 1));
    case Kind.NULL:
      return null;
    case Kind.VARIABLE:
      return variables ? variables[ast.name.value] : undefined;
    default:
      return undefined;
  }
};

export const GraphQLJSON = new GraphQLScalarType({
  name: 'JSON',
  description: 'GraphQL scalar representing arbitrary JSON values.',
  serialize: (value: unknown) => value,
  parseValue: (value: unknown) => value,
  parseLiteral: (ast: ValueNode, variables?: Record<string, unknown> | null) =>
    parseJsonLiteral(ast, variables, 0),
});

registerScalarType(GraphQLJSON, { overwrite: true });

export const JSONScalar = new ScalarToken('JSON');

export type ScalarResolvable =
  | ScalarToken
  | GraphQLScalarType
  | BooleanConstructor
  | NumberConstructor
  | StringConstructor
  | DateConstructor;
