import type { DataSource } from "typeorm";
import { UserEntity } from "@/infrastructure/db/entities/User";
import { EmailVerificationTokenEntity } from "@/infrastructure/db/entities/EmailVerificationToken";
import { PasswordResetTokenEntity } from "@/infrastructure/db/entities/PasswordResetToken";
import type { PasswordHasher } from "@/infrastructure/auth/password-hasher";
import { generateOpaqueToken, hashToken } from "@/infrastructure/auth/token-generator";
import { issueAccessToken } from "@/infrastructure/auth/jwt";
import { isValidEmail, normaliseEmail } from "@/domain/auth/email";
import type { EmailService } from "@/application/ports/email-service";
import type { Clock } from "@/application/ports/clock";

const VERIFICATION_TTL_HOURS = 24;
const RESET_TTL_HOURS = 1;

export class AuthError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
  }
}

export type SignupResult = {
  userId: string;
};

export type LoginResult = {
  token: string;
  expiresAt: Date;
  userId: string;
  email: string;
};

export class AuthService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly hasher: PasswordHasher,
    private readonly email: EmailService,
    private readonly clock: Clock,
    private readonly baseUrl: string,
  ) {}

  async signup(input: { email: string; password: string }): Promise<SignupResult> {
    if (!isValidEmail(input.email)) {
      throw new AuthError("Invalid email address", "INVALID_EMAIL");
    }
    const email = normaliseEmail(input.email);
    const userRepo = this.dataSource.getRepository(UserEntity);
    const existing = await userRepo.findOne({ where: { email } });
    if (existing) {
      throw new AuthError("An account with this email already exists", "EMAIL_TAKEN");
    }
    const password_hash = await this.hasher.hash(input.password);
    const user = await userRepo.save(
      userRepo.create({
        email,
        password_hash,
        status: "pending_verification",
      }),
    );
    await this.issueAndSendVerification(user.id, email);
    return { userId: user.id };
  }

  async resendVerification(email: string): Promise<void> {
    const userRepo = this.dataSource.getRepository(UserEntity);
    const user = await userRepo.findOne({ where: { email: normaliseEmail(email) } });
    if (!user || user.status !== "pending_verification") return;
    await this.issueAndSendVerification(user.id, user.email);
  }

  private async issueAndSendVerification(userId: string, email: string): Promise<void> {
    const token = generateOpaqueToken();
    const repo = this.dataSource.getRepository(EmailVerificationTokenEntity);
    await repo.insert({
      user_id: userId,
      token_hash: hashToken(token),
      expires_at: new Date(this.clock.now().getTime() + VERIFICATION_TTL_HOURS * 3_600_000),
    });
    await this.email.sendVerificationEmail({
      to: email,
      verifyUrl: `${this.baseUrl}/verify-email?token=${encodeURIComponent(token)}`,
    });
  }

  async verifyEmail(token: string): Promise<void> {
    const tokenRepo = this.dataSource.getRepository(EmailVerificationTokenEntity);
    const userRepo = this.dataSource.getRepository(UserEntity);
    const tokenHash = hashToken(token);
    const record = await tokenRepo.findOne({ where: { token_hash: tokenHash } });
    if (!record || record.used_at !== null || record.expires_at < this.clock.now()) {
      throw new AuthError("This verification link is invalid or has expired", "INVALID_TOKEN");
    }
    await tokenRepo.update({ id: record.id }, { used_at: this.clock.now() });
    await userRepo.update(
      { id: record.user_id },
      { status: "active", verified_at: this.clock.now() },
    );
  }

  async login(input: { email: string; password: string }): Promise<LoginResult> {
    const email = normaliseEmail(input.email);
    const userRepo = this.dataSource.getRepository(UserEntity);
    const user = await userRepo.findOne({ where: { email } });
    const genericError = new AuthError("Invalid email or password", "INVALID_CREDENTIALS");
    if (!user) {
      // Run a dummy hash to avoid timing-based user enumeration.
      await this.hasher.verify(
        "$argon2id$v=19$m=19456,t=2,p=1$YWFhYWFhYWFhYWFhYWFhYQ$L9F2K2T2Z7M8w0g4M6m9Cw",
        input.password,
      );
      throw genericError;
    }
    const ok = await this.hasher.verify(user.password_hash, input.password);
    if (!ok) throw genericError;
    if (user.status !== "active") {
      throw new AuthError(
        "Please verify your email address before logging in",
        "UNVERIFIED",
      );
    }
    const { token, expiresAt } = issueAccessToken({ id: user.id, email: user.email });
    return { token, expiresAt, userId: user.id, email: user.email };
  }

  async requestPasswordReset(email: string): Promise<void> {
    const userRepo = this.dataSource.getRepository(UserEntity);
    const user = await userRepo.findOne({ where: { email: normaliseEmail(email) } });
    if (!user) return; // anti-enumeration: silently succeed
    const token = generateOpaqueToken();
    const tokenRepo = this.dataSource.getRepository(PasswordResetTokenEntity);
    // Invalidate any prior outstanding tokens.
    await tokenRepo.update(
      { user_id: user.id, used_at: null as unknown as Date },
      { used_at: this.clock.now() },
    );
    await tokenRepo.insert({
      user_id: user.id,
      token_hash: hashToken(token),
      expires_at: new Date(this.clock.now().getTime() + RESET_TTL_HOURS * 3_600_000),
    });
    await this.email.sendPasswordResetEmail({
      to: user.email,
      resetUrl: `${this.baseUrl}/reset-password?token=${encodeURIComponent(token)}`,
    });
  }

  async resetPassword(input: { token: string; newPassword: string }): Promise<void> {
    const tokenRepo = this.dataSource.getRepository(PasswordResetTokenEntity);
    const userRepo = this.dataSource.getRepository(UserEntity);
    const record = await tokenRepo.findOne({ where: { token_hash: hashToken(input.token) } });
    if (!record || record.used_at !== null || record.expires_at < this.clock.now()) {
      throw new AuthError("This reset link is invalid or has expired", "INVALID_TOKEN");
    }
    const password_hash = await this.hasher.hash(input.newPassword);
    await tokenRepo.update({ id: record.id }, { used_at: this.clock.now() });
    await tokenRepo.update(
      { user_id: record.user_id, used_at: null as unknown as Date },
      { used_at: this.clock.now() },
    );
    await userRepo.update({ id: record.user_id }, { password_hash });
  }
}

export function buildAuthService(deps: {
  dataSource: DataSource;
  hasher: PasswordHasher;
  email: EmailService;
  clock: Clock;
  baseUrl?: string;
}): AuthService {
  const baseUrl = deps.baseUrl ?? process.env.APP_BASE_URL ?? "http://localhost:3000";
  return new AuthService(deps.dataSource, deps.hasher, deps.email, deps.clock, baseUrl);
}
