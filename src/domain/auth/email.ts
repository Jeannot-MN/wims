const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  if (typeof email !== "string") return false;
  if (email.length > 320) return false;
  return EMAIL_RE.test(email.trim());
}

export function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}
