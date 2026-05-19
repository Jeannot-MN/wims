import type { DataSource } from "typeorm";
import { getDataSource } from "@/infrastructure/db/datasource";
import { verifyAccessToken } from "@/infrastructure/auth/jwt";
import { ConsoleEmailService } from "@/infrastructure/email/console-email-service";
import type { EmailService } from "@/application/ports/email-service";

export type AuthenticatedUser = {
  id: string;
  email: string;
};

export type GraphQLContext = {
  dataSource: DataSource;
  currentUser: AuthenticatedUser | null;
  email: EmailService;
  requestIp: string;
};

export type ContextOverrides = Partial<
  Pick<GraphQLContext, "email" | "currentUser">
>;

let cachedEmailService: EmailService | null = null;

function defaultEmailService(): EmailService {
  if (!cachedEmailService) {
    cachedEmailService = new ConsoleEmailService();
  }
  return cachedEmailService;
}

export async function buildContext(
  request: Request,
  overrides?: ContextOverrides,
): Promise<GraphQLContext> {
  const dataSource = await getDataSource();
  const email = overrides?.email ?? defaultEmailService();

  let currentUser: AuthenticatedUser | null = overrides?.currentUser ?? null;
  if (!currentUser) {
    const authHeader = request.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice("Bearer ".length).trim();
      const payload = await verifyAccessToken(token);
      if (payload) {
        currentUser = { id: payload.sub, email: payload.email };
      }
    }
  }

  const requestIp =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";

  return { dataSource, currentUser, email, requestIp };
}

export function resetEmailServiceCache(): void {
  cachedEmailService = null;
}
