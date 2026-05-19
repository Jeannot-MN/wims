import type {
  EmailService,
  PasswordResetEmail,
  RsvpConfirmationEmail,
  VerificationEmail,
} from "@/application/ports/email-service";
import { getDataSource } from "@/infrastructure/db/datasource";
import { SentEmailEntity, type EmailKind } from "@/infrastructure/db/entities/SentEmail";

export class ConsoleEmailService implements EmailService {
  async sendVerificationEmail(input: VerificationEmail): Promise<void> {
    const subject = "Verify your WIMS account";
    const body = `Welcome to WIMS! Confirm your email by visiting:\n\n${input.verifyUrl}\n\nIf you didn't sign up, ignore this email.`;
    await this.persistAndLog("verification", input.to, subject, body);
  }

  async sendPasswordResetEmail(input: PasswordResetEmail): Promise<void> {
    const subject = "Reset your WIMS password";
    const body = `We received a request to reset your password. Visit:\n\n${input.resetUrl}\n\nIf you didn't request this, ignore this email.`;
    await this.persistAndLog("password_reset", input.to, subject, body);
  }

  async sendRsvpConfirmationEmail(input: RsvpConfirmationEmail): Promise<void> {
    const subject = `RSVP confirmed — ${input.eventTitle}`;
    const body = `Your RSVP for "${input.eventTitle}" has been recorded as: ${input.status}.`;
    await this.persistAndLog("rsvp_confirmation", input.to, subject, body);
  }

  private async persistAndLog(
    kind: EmailKind,
    to: string,
    subject: string,
    body: string,
  ): Promise<void> {
    const ds = await getDataSource();
    const repo = ds.getRepository(SentEmailEntity);
    await repo.insert({ to_address: to, subject, body, kind });
    if (process.env.NODE_ENV !== "test") {
      // eslint-disable-next-line no-console
      console.log(`[email:${kind}] to=${to} subject=${subject}\n${body}\n`);
    }
  }
}
