import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * French counterparts for the guest-facing event text, so the invitation can be
 * read in either language.
 *
 * Only the prose a guest actually reads gets a translation. The address, the
 * registry URL and the cover image are the same in both languages, and the
 * schedule/custom-section translations live inside their existing jsonb rows
 * (`title_fr`, `description_fr`, `heading_fr`, `body_fr`) rather than in new
 * columns — the keys are optional, so existing rows stay valid.
 */
export class FrenchTranslations1700000000002 implements MigrationInterface {
  name = "FrenchTranslations1700000000002";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "events" ADD COLUMN "title_fr" text NOT NULL DEFAULT '';`);
    await queryRunner.query(`ALTER TABLE "events" ADD COLUMN "description_fr" text NOT NULL DEFAULT '';`);
    await queryRunner.query(`ALTER TABLE "events" ADD COLUMN "dress_code_fr" text NOT NULL DEFAULT '';`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "events" DROP COLUMN IF EXISTS "dress_code_fr";`);
    await queryRunner.query(`ALTER TABLE "events" DROP COLUMN IF EXISTS "description_fr";`);
    await queryRunner.query(`ALTER TABLE "events" DROP COLUMN IF EXISTS "title_fr";`);
  }
}
