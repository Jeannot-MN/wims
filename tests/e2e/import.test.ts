import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { resetDatabase, setupDatabase, teardownDatabase } from "../helpers/test-db";
import { expectOk, runQuery } from "../helpers/gql";
import { CapturingEmailService } from "../helpers/email-capture";

const email = new CapturingEmailService();
const CTX = { email };

const SIGNUP = `mutation S($email: String!, $password: String!) { signup(email: $email, password: $password) { userId } }`;
const VERIFY = `mutation V($token: String!) { verifyEmail(token: $token) }`;
const LOGIN = `mutation L($email: String!, $password: String!) { login(email: $email, password: $password) { token } }`;
const CREATE_EVENT = `mutation Create($input: EventCreateInput!) { createEvent(input: $input) { id } }`;
const PREVIEW = `
  mutation P($eventId: ID!, $fileBase64: String!) {
    previewInviteeImport(eventId: $eventId, fileBase64: $fileBase64) {
      previewId
      rows { rowIndex status reason primary_first_name primary_last_name email }
    }
  }
`;
const COMMIT = `
  mutation C($previewId: String!, $skipRowIndices: [Int!]) {
    commitInviteeImport(previewId: $previewId, skipRowIndices: $skipRowIndices) {
      id primary_first_name email
    }
  }
`;

async function setupHost(addr: string) {
  await runQuery(SIGNUP, { variables: { email: addr, password: "supersecret1" }, context: CTX });
  const t = email.lastVerificationTokenFor(addr);
  await runQuery(VERIFY, { variables: { token: t! }, context: CTX });
  const login = await runQuery<{ login: { token: string } }>(LOGIN, {
    variables: { email: addr, password: "supersecret1" },
    context: CTX,
  });
  const token = expectOk(login).login.token;
  const evt = await runQuery<{ createEvent: { id: string } }>(CREATE_EVENT, {
    variables: { input: { title: "T", starts_at: new Date("2026-09-15T15:00:00Z").toISOString() } },
    authToken: token,
    context: CTX,
  });
  return { token, eventId: expectOk(evt).createEvent.id };
}

function makeXlsx(rows: Record<string, string>[]): string {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Invitees");
  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  return Buffer.from(buffer).toString("base64");
}

describe("Phase 7 — Excel import", () => {
  beforeAll(async () => {
    await setupDatabase();
  });
  beforeEach(async () => {
    await resetDatabase();
    email.reset();
  });
  afterAll(async () => {
    await teardownDatabase();
  });

  it("imports a clean file end-to-end", async () => {
    const h = await setupHost("import1@example.com");
    const xlsx = makeXlsx([
      { first_name: "Alice", last_name: "Smith", email: "alice@a.com", mobile_no: "+27821234567" },
      { first_name: "Bob", last_name: "Jones", email: "bob@b.com", mobile_no: "+27821234568" },
    ]);
    const prev = await runQuery<{ previewInviteeImport: { previewId: string; rows: { status: string }[] } }>(
      PREVIEW,
      { variables: { eventId: h.eventId, fileBase64: xlsx }, authToken: h.token, context: CTX },
    );
    const p = expectOk(prev).previewInviteeImport;
    expect(p.rows.every((r) => r.status === "ok")).toBe(true);

    const commit = await runQuery<{ commitInviteeImport: unknown[] }>(COMMIT, {
      variables: { previewId: p.previewId },
      authToken: h.token,
      context: CTX,
    });
    expect(expectOk(commit).commitInviteeImport).toHaveLength(2);
  });

  it("flags warnings for missing email/phone but still imports", async () => {
    const h = await setupHost("import2@example.com");
    const xlsx = makeXlsx([
      { first_name: "Grandma", last_name: "Doe" },
      { first_name: "Alice", last_name: "Smith", email: "alice@a.com" },
    ]);
    const prev = await runQuery<{ previewInviteeImport: { previewId: string; rows: { status: string; reason: string | null }[] } }>(
      PREVIEW,
      { variables: { eventId: h.eventId, fileBase64: xlsx }, authToken: h.token, context: CTX },
    );
    const rows = expectOk(prev).previewInviteeImport.rows;
    expect(rows[0]?.status).toBe("warning");
    expect(rows[0]?.reason).toBe("missing_both");
    expect(rows[1]?.status).toBe("warning");
    expect(rows[1]?.reason).toBe("missing_phone");

    const commit = await runQuery<{ commitInviteeImport: unknown[] }>(COMMIT, {
      variables: { previewId: expectOk(prev).previewInviteeImport.previewId },
      authToken: h.token,
      context: CTX,
    });
    expect(expectOk(commit).commitInviteeImport).toHaveLength(2);
  });

  it("flags errors and skips them on commit", async () => {
    const h = await setupHost("import3@example.com");
    const xlsx = makeXlsx([
      { first_name: "Good", last_name: "One", email: "good@a.com" },
      { first_name: "", last_name: "NoFirstName", email: "no@a.com" },
      { first_name: "BadEmail", last_name: "X", email: "not-an-email" },
    ]);
    const prev = await runQuery<{ previewInviteeImport: { previewId: string; rows: { status: string }[] } }>(
      PREVIEW,
      { variables: { eventId: h.eventId, fileBase64: xlsx }, authToken: h.token, context: CTX },
    );
    const rows = expectOk(prev).previewInviteeImport.rows;
    expect(rows.filter((r) => r.status === "error")).toHaveLength(2);

    const commit = await runQuery<{ commitInviteeImport: unknown[] }>(COMMIT, {
      variables: { previewId: expectOk(prev).previewInviteeImport.previewId },
      authToken: h.token,
      context: CTX,
    });
    expect(expectOk(commit).commitInviteeImport).toHaveLength(1);
  });

  it("detects duplicates against existing invitees", async () => {
    const h = await setupHost("import4@example.com");
    const first = makeXlsx([{ first_name: "Alice", last_name: "Smith", email: "alice@a.com" }]);
    const p1 = await runQuery<{ previewInviteeImport: { previewId: string } }>(PREVIEW, {
      variables: { eventId: h.eventId, fileBase64: first },
      authToken: h.token,
      context: CTX,
    });
    await runQuery(COMMIT, {
      variables: { previewId: expectOk(p1).previewInviteeImport.previewId },
      authToken: h.token,
      context: CTX,
    });

    const second = makeXlsx([
      { first_name: "Alice", last_name: "Smith", email: "alice@a.com" },
      { first_name: "Bob", last_name: "Jones", email: "bob@b.com" },
    ]);
    const p2 = await runQuery<{ previewInviteeImport: { rows: { status: string }[] } }>(PREVIEW, {
      variables: { eventId: h.eventId, fileBase64: second },
      authToken: h.token,
      context: CTX,
    });
    const rows = expectOk(p2).previewInviteeImport.rows;
    expect(rows[0]?.status).toBe("duplicate");
    expect(rows[1]?.status).toMatch(/ok|warning/);
  });

  it("respects skipRowIndices on commit", async () => {
    const h = await setupHost("import5@example.com");
    const xlsx = makeXlsx([
      { first_name: "A", last_name: "B", email: "a@b.com" },
      { first_name: "C", last_name: "D", email: "c@d.com" },
      { first_name: "E", last_name: "F", email: "e@f.com" },
    ]);
    const prev = await runQuery<{ previewInviteeImport: { previewId: string; rows: { rowIndex: number }[] } }>(
      PREVIEW,
      { variables: { eventId: h.eventId, fileBase64: xlsx }, authToken: h.token, context: CTX },
    );
    const p = expectOk(prev).previewInviteeImport;
    const skip = [p.rows[1]?.rowIndex].filter((v): v is number => typeof v === "number");

    const commit = await runQuery<{ commitInviteeImport: { primary_first_name: string }[] }>(COMMIT, {
      variables: { previewId: p.previewId, skipRowIndices: skip },
      authToken: h.token,
      context: CTX,
    });
    const created = expectOk(commit).commitInviteeImport;
    expect(created).toHaveLength(2);
    expect(created.map((x) => x.primary_first_name).sort()).toEqual(["A", "E"]);
  });

  it("rejects cross-user preview", async () => {
    const alice = await setupHost("alice-imp@example.com");
    const bob = await setupHost("bob-imp@example.com");
    const xlsx = makeXlsx([{ first_name: "X", last_name: "Y", email: "x@y.com" }]);
    const r = await runQuery(PREVIEW, {
      variables: { eventId: alice.eventId, fileBase64: xlsx },
      authToken: bob.token,
      context: CTX,
    });
    expect(r.errors?.[0]?.message).toMatch(/forbidden/i);
  });
});
