import "reflect-metadata";
import { DataSource } from "typeorm";
import { UserEntity } from "./entities/User";
import { EmailVerificationTokenEntity } from "./entities/EmailVerificationToken";
import { PasswordResetTokenEntity } from "./entities/PasswordResetToken";
import { SentEmailEntity } from "./entities/SentEmail";
import { EventEntity } from "./entities/Event";
import { InviteeEntity } from "./entities/Invitee";
import { RsvpEntity } from "./entities/Rsvp";
import { InitialSchema1700000000001 } from "./migrations/0001_initial_schema";

const isProd = process.env.NODE_ENV === "production";
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set");
}

const useSsl = databaseUrl.includes("sslmode=require") || databaseUrl.includes("neon.tech");

declare global {
  // eslint-disable-next-line no-var
  var __wims_datasource: DataSource | undefined;
}

// On Next.js HMR reload, our entity classes get re-evaluated and become NEW
// class identities. A cached DataSource from a previous HMR cycle would have
// metadata keyed against the OLD class identities — which is why
// `ds.getRepository(UserEntity)` then throws "No metadata for ...". Tear it
// down before constructing a fresh one bound to the current classes.
if (globalThis.__wims_datasource && globalThis.__wims_datasource.isInitialized) {
  void globalThis.__wims_datasource.destroy().catch(() => {});
}

export const AppDataSource = new DataSource({
  type: "postgres",
  url: databaseUrl,
  ssl: useSsl ? { rejectUnauthorized: false } : false,
  synchronize: false,
  logging: !isProd && process.env.DB_LOGGING === "true",
  entities: [
    UserEntity,
    EmailVerificationTokenEntity,
    PasswordResetTokenEntity,
    SentEmailEntity,
    EventEntity,
    InviteeEntity,
    RsvpEntity,
  ],
  migrations: [InitialSchema1700000000001],
});

globalThis.__wims_datasource = AppDataSource;

export async function getDataSource(): Promise<DataSource> {
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }
  return AppDataSource;
}
