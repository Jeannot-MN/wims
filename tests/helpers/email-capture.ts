import type {
  EmailService,
  PasswordResetEmail,
  RsvpConfirmationEmail,
  VerificationEmail,
} from "@/application/ports/email-service";

export type CapturedEmail =
  | ({ kind: "verification" } & VerificationEmail)
  | ({ kind: "password_reset" } & PasswordResetEmail)
  | ({ kind: "rsvp_confirmation" } & RsvpConfirmationEmail);

export class CapturingEmailService implements EmailService {
  public readonly emails: CapturedEmail[] = [];

  async sendVerificationEmail(input: VerificationEmail): Promise<void> {
    this.emails.push({ kind: "verification", ...input });
  }
  async sendPasswordResetEmail(input: PasswordResetEmail): Promise<void> {
    this.emails.push({ kind: "password_reset", ...input });
  }
  async sendRsvpConfirmationEmail(input: RsvpConfirmationEmail): Promise<void> {
    this.emails.push({ kind: "rsvp_confirmation", ...input });
  }

  lastVerificationTokenFor(email: string): string | null {
    for (let i = this.emails.length - 1; i >= 0; i--) {
      const e = this.emails[i];
      if (e && e.kind === "verification" && e.to === email) {
        return extractTokenParam(e.verifyUrl);
      }
    }
    return null;
  }

  lastResetTokenFor(email: string): string | null {
    for (let i = this.emails.length - 1; i >= 0; i--) {
      const e = this.emails[i];
      if (e && e.kind === "password_reset" && e.to === email) {
        return extractTokenParam(e.resetUrl);
      }
    }
    return null;
  }

  reset(): void {
    this.emails.length = 0;
  }
}

function extractTokenParam(url: string): string | null {
  try {
    const u = new URL(url);
    return u.searchParams.get("token");
  } catch {
    return null;
  }
}
