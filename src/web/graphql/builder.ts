import SchemaBuilder from "@pothos/core";
import type { GraphQLContext } from "./context";

export const builder = new SchemaBuilder<{
  Context: GraphQLContext;
  Scalars: {
    DateTime: { Input: Date; Output: Date };
    ID: { Input: string; Output: string };
  };
}>({});

builder.queryType({});
builder.mutationType({
  fields: (t) => ({
    _noop: t.boolean({ resolve: () => true }),
  }),
});

builder.scalarType("DateTime", {
  serialize: (value) => (value instanceof Date ? value.toISOString() : new Date(value as string).toISOString()),
  parseValue: (value) => {
    if (typeof value !== "string") throw new Error("DateTime must be an ISO string");
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) throw new Error("Invalid DateTime");
    return d;
  },
});
