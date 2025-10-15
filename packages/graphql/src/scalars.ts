import { GraphQLScalarType, Kind, type ValueNode } from 'graphql';
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

const parseObjectFields = (
  fields: ReadonlyArray<{ name: { value: string }; value: ValueNode }>,
  variables?: Record<string, unknown> | null,
): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  for (const field of fields) {
    result[field.name.value] = parseJsonLiteral(field.value, variables);
  }
  return result;
};

const parseJsonLiteral = (ast: ValueNode, variables?: Record<string, unknown> | null): unknown => {
  switch (ast.kind) {
    case Kind.STRING:
    case Kind.BOOLEAN:
      return ast.value;
    case Kind.INT:
    case Kind.FLOAT:
      return Number(ast.value);
    case Kind.OBJECT:
      return parseObjectFields(ast.fields, variables);
    case Kind.LIST:
      return ast.values.map((value) => parseJsonLiteral(value, variables));
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
  parseLiteral: (ast: ValueNode, variables?: Record<string, unknown> | null) => parseJsonLiteral(ast, variables),
});

registerScalarType(GraphQLJSON);

export const JSONScalar = new ScalarToken('JSON');

export type ScalarResolvable =
  | ScalarToken
  | GraphQLScalarType
  | BooleanConstructor
  | NumberConstructor
  | StringConstructor
  | DateConstructor;
