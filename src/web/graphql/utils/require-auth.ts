import { GraphQLError } from "graphql";
import type { AuthenticatedUser, GraphQLContext } from "../context";

export function requireAuth(ctx: GraphQLContext): AuthenticatedUser {
  if (!ctx.currentUser) {
    throw new GraphQLError("Authentication required", {
      extensions: { code: "UNAUTHENTICATED" },
    });
  }
  return ctx.currentUser;
}
