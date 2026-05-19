import { isValidEmail } from "@/domain/auth/email";

export type ContactValidation =
  | { kind: "ok" }
  | { kind: "warning"; reason: "missing_email" | "missing_phone" | "missing_both" }
  | { kind: "error"; reason: "invalid_email" | "invalid_phone" | "missing_name" };

const PHONE_RE = /^\+?[0-9 ()\-]{6,40}$/;

export class InviteeContactPolicy {
  validate(input: {
    first_name?: string | null;
    last_name?: string | null;
    email?: string | null;
    mobile_no?: string | null;
  }): ContactValidation {
    const first = (input.first_name ?? "").trim();
    const last = (input.last_name ?? "").trim();
    if (!first || !last) {
      return { kind: "error", reason: "missing_name" };
    }
    const email = (input.email ?? "").trim();
    const phone = (input.mobile_no ?? "").trim();
    if (email && !isValidEmail(email)) {
      return { kind: "error", reason: "invalid_email" };
    }
    if (phone && !PHONE_RE.test(phone)) {
      return { kind: "error", reason: "invalid_phone" };
    }
    if (!email && !phone) {
      return { kind: "warning", reason: "missing_both" };
    }
    if (!email) {
      return { kind: "warning", reason: "missing_email" };
    }
    if (!phone) {
      return { kind: "warning", reason: "missing_phone" };
    }
    return { kind: "ok" };
  }
}
