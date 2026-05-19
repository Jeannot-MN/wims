import { createYoga, type YogaServerInstance } from "graphql-yoga";
import { schema } from "@/web/graphql/schema";
import type { ContextOverrides } from "@/web/graphql/context";
import { buildContext } from "@/web/graphql/context";

type Yoga = YogaServerInstance<Record<string, unknown>, Record<string, unknown>>;

let _yoga: Yoga | null = null;
let _overrides: ContextOverrides | undefined;

function getYoga(): Yoga {
  if (!_yoga) {
    _yoga = createYoga({
      schema,
      graphqlEndpoint: "/api/graphql",
      fetchAPI: { Response, Request },
      context: ({ request }: { request: Request }) =>
        buildContext(request, _overrides),
      landingPage: false,
      maskedErrors: false,
    }) as unknown as Yoga;
  }
  return _yoga;
}

export type GqlOptions = {
  variables?: Record<string, unknown>;
  authToken?: string;
  context?: ContextOverrides;
};

export type GqlResult<TData> = {
  data: TData | null;
  errors: Array<{ message: string; [key: string]: unknown }> | undefined;
};

export async function runQuery<TData = Record<string, unknown>>(
  source: string,
  options: GqlOptions = {},
): Promise<GqlResult<TData>> {
  _overrides = options.context;
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (options.authToken) headers.authorization = `Bearer ${options.authToken}`;
  const request = new Request("http://test.local/api/graphql", {
    method: "POST",
    headers,
    body: JSON.stringify({ query: source, variables: options.variables }),
  });
  const response = await getYoga().fetch(request);
  _overrides = undefined;
  const json = (await response.json()) as GqlResult<TData>;
  return json;
}

export function expectOk<TData>(result: GqlResult<TData>): TData {
  if (result.errors && result.errors.length > 0) {
    throw new Error(`GraphQL errors: ${JSON.stringify(result.errors, null, 2)}`);
  }
  if (!result.data) throw new Error("No data returned");
  return result.data;
}
