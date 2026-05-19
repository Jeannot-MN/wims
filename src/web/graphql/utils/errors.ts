import { GraphQLError } from "graphql";
import { AuthError } from "@/application/services/auth-service";

export function toGraphQLError(err: unknown): GraphQLError {
  if (err instanceof GraphQLError) return err;
  if (err instanceof AuthError) {
    return new GraphQLError(err.message, {
      extensions: { code: err.code },
    });
  }
  if (err instanceof Error) {
    return new GraphQLError(err.message, {
      extensions: { code: "INTERNAL_ERROR" },
    });
  }
  return new GraphQLError("Unknown error", {
    extensions: { code: "INTERNAL_ERROR" },
  });
}

export async function wrap<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    throw toGraphQLError(err);
  }
}
