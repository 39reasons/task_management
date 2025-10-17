import { GraphQLScalarType, Kind, type ValueNode } from "graphql";

function parseJSONLiteral(ast: ValueNode): unknown {
  switch (ast.kind) {
    case Kind.STRING:
    case Kind.BOOLEAN:
    case Kind.ENUM:
      return ast.value;
    case Kind.INT:
    case Kind.FLOAT:
      return Number(ast.value);
    case Kind.OBJECT: {
      const value: Record<string, unknown> = {};
      for (const field of ast.fields) {
        value[field.name.value] = parseJSONLiteral(field.value);
      }
      return value;
    }
    case Kind.LIST:
      return ast.values.map((valueAst) => parseJSONLiteral(valueAst));
    case Kind.NULL:
      return null;
    default:
      return null;
  }
}

export const scalarResolvers = {
  JSON: new GraphQLScalarType({
    name: "JSON",
    description: "Arbitrary JSON value.",
    serialize(value: unknown): unknown {
      return value;
    },
    parseValue(value: unknown): unknown {
      return value;
    },
    parseLiteral(ast): unknown {
      return parseJSONLiteral(ast);
    },
  }),
};

export default scalarResolvers;
