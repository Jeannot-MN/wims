import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { resetDatabase, setupDatabase, teardownDatabase } from "../helpers/test-db";
import { expectOk, runQuery } from "../helpers/gql";

describe("Phase 0 — health", () => {
  beforeAll(async () => {
    await setupDatabase();
  });

  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await teardownDatabase();
  });

  it("responds with database + now", async () => {
    const result = await runQuery<{
      health: { ok: boolean; database: string; now: string };
    }>(`
      query { health { ok database now } }
    `);
    const data = expectOk(result);
    expect(data.health.ok).toBe(true);
    expect(data.health.database).toMatch(/PostgreSQL/);
    expect(new Date(data.health.now).getTime()).not.toBeNaN();
  });
});
