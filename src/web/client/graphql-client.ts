"use client";

import { loadToken, clearToken } from "./auth-storage";

export type GraphQLError = {
  message: string;
  extensions?: { code?: string };
};

export type GraphQLResponse<T> = {
  data?: T;
  errors?: GraphQLError[];
};

export class GraphQLRequestError extends Error {
  constructor(public readonly errors: GraphQLError[]) {
    super(errors[0]?.message ?? "GraphQL request failed");
  }
}

export async function gql<T>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const token = loadToken();
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (token) headers.authorization = `Bearer ${token.token}`;
  const res = await fetch("/api/graphql", {
    method: "POST",
    headers,
    body: JSON.stringify({ query, variables }),
  });
  const json = (await res.json()) as GraphQLResponse<T>;
  if (json.errors && json.errors.length > 0) {
    if (json.errors.some((e) => e.extensions?.code === "UNAUTHENTICATED")) {
      clearToken();
      if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
        window.location.href = "/login";
      }
    }
    throw new GraphQLRequestError(json.errors);
  }
  if (!json.data) throw new Error("No data returned");
  return json.data;
}
