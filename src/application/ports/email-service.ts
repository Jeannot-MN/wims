export type EmailEnvelope = {
  to: string;
  subject: string;
  body: string;
};

export type VerificationEmail = {
  to: string;
  verifyUrl: string;
};

export type PasswordResetEmail = {
  to: string;
  resetUrl: string;
};

export type RsvpConfirmationEmail = {
  to: string;
  eventTitle: string;
  status: string;
};

export interface EmailService {
  sendVerificationEmail(input: VerificationEmail): Promise<void>;
  sendPasswordResetEmail(input: PasswordResetEmail): Promise<void>;
  sendRsvpConfirmationEmail(input: RsvpConfirmationEmail): Promise<void>;
}
