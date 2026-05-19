import "reflect-metadata";

if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = "test-secret-must-be-at-least-32-characters-long-for-jwt";
}

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL =
    process.env.TEST_DATABASE_URL ?? "postgres://wims:wims@localhost:55432/wims_test";
}

// NODE_ENV is read-only in @types/node — assign via mutable index access.
(process.env as Record<string, string>).NODE_ENV = "test";
process.env.APP_BASE_URL = process.env.APP_BASE_URL ?? "http://localhost:3000";
