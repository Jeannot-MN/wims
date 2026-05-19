import { getDataSource } from "@/infrastructure/db/datasource";
import { AppDataSource } from "@/infrastructure/db/datasource";

let migrated = false;

export async function setupDatabase(): Promise<void> {
  const ds = await getDataSource();
  if (!migrated) {
    await ds.runMigrations({ transaction: "all" });
    migrated = true;
  }
}

export async function resetDatabase(): Promise<void> {
  const ds = await getDataSource();
  await ds.query(`
    TRUNCATE TABLE
      "rsvps",
      "invitees",
      "events",
      "sent_emails",
      "password_reset_tokens",
      "email_verification_tokens",
      "users"
    RESTART IDENTITY CASCADE;
  `);
}

export async function teardownDatabase(): Promise<void> {
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
  }
}
