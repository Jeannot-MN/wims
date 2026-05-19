import type { DataSource } from "typeorm";
import { Argon2PasswordHasher } from "@/infrastructure/auth/password-hasher";
import { SystemClock } from "@/application/ports/clock";
import { buildAuthService } from "@/application/services/auth-service";
import type { EmailService } from "@/application/ports/email-service";

const hasher = new Argon2PasswordHasher();
const clock = new SystemClock();

export function authServiceFromCtx(ctx: { dataSource: DataSource; email: EmailService }) {
  return buildAuthService({
    dataSource: ctx.dataSource,
    hasher,
    email: ctx.email,
    clock,
  });
}
