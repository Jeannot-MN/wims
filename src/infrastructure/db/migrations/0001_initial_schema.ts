import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1700000000001 implements MigrationInterface {
  name = "InitialSchema1700000000001";


  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);

    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "email" varchar(320) NOT NULL,
        "password_hash" varchar(255) NOT NULL,
        "status" varchar(32) NOT NULL DEFAULT 'pending_verification',
        "verified_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX "users_email_idx" ON "users" ("email");`);

    await queryRunner.query(`
      CREATE TABLE "email_verification_tokens" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "token_hash" varchar(255) NOT NULL,
        "expires_at" timestamptz NOT NULL,
        "used_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX "evt_token_hash_idx" ON "email_verification_tokens" ("token_hash");`);
    await queryRunner.query(`CREATE INDEX "evt_user_idx" ON "email_verification_tokens" ("user_id");`);

    await queryRunner.query(`
      CREATE TABLE "password_reset_tokens" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "token_hash" varchar(255) NOT NULL,
        "expires_at" timestamptz NOT NULL,
        "used_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX "prt_token_hash_idx" ON "password_reset_tokens" ("token_hash");`);
    await queryRunner.query(`CREATE INDEX "prt_user_idx" ON "password_reset_tokens" ("user_id");`);

    await queryRunner.query(`
      CREATE TABLE "sent_emails" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "to_address" varchar(320) NOT NULL,
        "subject" varchar(512) NOT NULL,
        "body" text NOT NULL,
        "kind" varchar(64) NOT NULL,
        "sent_at" timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`CREATE INDEX "sent_emails_to_idx" ON "sent_emails" ("to_address");`);

    await queryRunner.query(`
      CREATE TABLE "events" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "owner_user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "event_type" varchar(32) NOT NULL DEFAULT 'wedding',
        "title" varchar(255) NOT NULL,
        "description" text NOT NULL DEFAULT '',
        "starts_at" timestamptz NOT NULL,
        "ends_at" timestamptz,
        "address_text" text NOT NULL DEFAULT '',
        "place_id" varchar(255),
        "formatted_address" text,
        "latitude" double precision,
        "longitude" double precision,
        "rsvp_deadline_at" timestamptz,
        "dress_code" text NOT NULL DEFAULT '',
        "gift_registry_url" text NOT NULL DEFAULT '',
        "schedule" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "custom_sections" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "cover_image_url" text NOT NULL DEFAULT '',
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`CREATE INDEX "events_owner_idx" ON "events" ("owner_user_id");`);

    await queryRunner.query(`
      CREATE TABLE "invitees" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "event_id" uuid NOT NULL REFERENCES "events"("id") ON DELETE CASCADE,
        "invite_token" varchar(16) NOT NULL,
        "primary_first_name" varchar(120) NOT NULL,
        "primary_last_name" varchar(120) NOT NULL,
        "partner_first_name" varchar(120),
        "partner_last_name" varchar(120),
        "email" varchar(320),
        "mobile_no" varchar(40),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX "invitees_token_idx" ON "invitees" ("invite_token");`);
    await queryRunner.query(`CREATE INDEX "invitees_event_idx" ON "invitees" ("event_id");`);

    await queryRunner.query(`
      CREATE TABLE "rsvps" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "invitee_id" uuid NOT NULL REFERENCES "invitees"("id") ON DELETE CASCADE,
        "status" varchar(16) NOT NULL DEFAULT 'pending',
        "dietary_restrictions" text NOT NULL DEFAULT '',
        "song_requests" text NOT NULL DEFAULT '',
        "accommodation_needed" boolean NOT NULL DEFAULT false,
        "submitted_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX "rsvps_invitee_idx" ON "rsvps" ("invitee_id");`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "rsvps";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "invitees";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "events";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "sent_emails";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "password_reset_tokens";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "email_verification_tokens";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users";`);
  }
}
