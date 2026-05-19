import { createYoga, createSchema } from "graphql-yoga";
import { schema } from "@/web/graphql/schema";
import { buildContext } from "@/web/graphql/context";

const yoga = createYoga({
  schema,
  graphqlEndpoint: "/api/graphql",
  fetchAPI: { Response, Request },
  context: ({ request }) => buildContext(request),
  graphiql: process.env.NODE_ENV !== "production",
  cors: false,
  landingPage: false,
});

export async function GET(request: Request) {
  return yoga.fetch(request);
}

export async function POST(request: Request) {
  return yoga.fetch(request);
}

export async function OPTIONS(request: Request) {
  return yoga.fetch(request);
}
