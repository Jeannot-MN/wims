import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { resetDatabase, setupDatabase, teardownDatabase } from "../helpers/test-db";
import { expectOk, runQuery } from "../helpers/gql";
import { CapturingEmailService } from "../helpers/email-capture";
import { resetRsvpRateLimit } from "@/application/services/rsvp-service";

const email = new CapturingEmailService();
const CTX = { email };

const SIGNUP = `mutation S($email: String!, $password: String!) { signup(email: $email, password: $password) { userId } }`;
const VERIFY = `mutation V($token: String!) { verifyEmail(token: $token) }`;
const LOGIN = `mutation L($email: String!, $password: String!) { login(email: $email, password: $password) { token } }`;
const CREATE_EVENT = `mutation Create($input: EventCreateInput!) { createEvent(input: $input) { id } }`;
const ADD_INVITEE = `mutation Add($eventId: ID!, $input: InviteeInput!) { addInvitee(eventId: $eventId, input: $input) { invite_token } }`;
const SUBMIT = `mutation Sub($token: String!, $input: SubmitRsvpInput!) { submitRsvp(token: $token, input: $input) { rsvp { status } } }`;
const STATS = `query S($eventId: ID!) { eventDashboardStats(eventId: $eventId) { total accepted declined maybe pending } }`;
const LIST = `query L($eventId: ID!, $status: String, $search: String, $sort: String, $direction: String) {
  eventInviteesList(eventId: $eventId, status: $status, search: $search, sort: $sort, direction: $direction) {
    id primary_first_name primary_last_name rsvp_status email
  }
}`;
const EXPORT = `mutation E($eventId: ID!) { exportInvitees(eventId: $eventId) { filename base64 } }`;

async function setupHostWithRsvps() {
  await runQuery(SIGNUP, { variables: { email: "dash@example.com", password: "supersecret1" }, context: CTX });
  const t = email.lastVerificationTokenFor("dash@example.com");
  await runQuery(VERIFY, { variables: { token: t! }, context: CTX });
  const login = await runQuery<{ login: { token: string } }>(LOGIN, {
    variables: { email: "dash@example.com", password: "supersecret1" },
    context: CTX,
  });
  const token = expectOk(login).login.token;
  const evt = await runQuery<{ createEvent: { id: string } }>(CREATE_EVENT, {
    variables: { input: { title: "T", starts_at: new Date("2026-09-15T15:00:00Z").toISOString() } },
    authToken: token,
    context: CTX,
  });
  const eventId = expectOk(evt).createEvent.id;

  const people = [
    { first: "Alice", last: "Smith", email: "alice@a.com", status: "accepted" },
    { first: "Bob", last: "Jones", email: "bob@b.com", status: "accepted" },
    { first: "Carol", last: "Brown", email: "carol@c.com", status: "declined" },
    { first: "Dave", last: "Adams", email: "dave@d.com", status: "maybe" },
    { first: "Eve", last: "Zeta", email: "eve@e.com", status: null }, // pending
  ];

  for (const p of people) {
    const inv = await runQuery<{ addInvitee: { invite_token: string } }>(ADD_INVITEE, {
      variables: {
        eventId,
        input: {
          primary_first_name: p.first,
          primary_last_name: p.last,
          email: p.email,
          mobile_no: "+27821234567",
        },
      },
      authToken: token,
      context: CTX,
    });
    if (p.status) {
      await runQuery(SUBMIT, {
        variables: {
          token: expectOk(inv).addInvitee.invite_token,
          input: { status: p.status },
        },
        context: CTX,
      });
    }
  }
  return { token, eventId };
}

describe("Phase 10 — dashboard + export", () => {
  beforeAll(async () => {
    await setupDatabase();
  });
  beforeEach(async () => {
    await resetDatabase();
    email.reset();
    resetRsvpRateLimit();
  });
  afterAll(async () => {
    await teardownDatabase();
  });

  it("returns accurate stats", async () => {
    const h = await setupHostWithRsvps();
    const r = await runQuery<{ eventDashboardStats: { total: number; accepted: number; declined: number; maybe: number; pending: number } }>(
      STATS,
      { variables: { eventId: h.eventId }, authToken: h.token, context: CTX },
    );
    const s = expectOk(r).eventDashboardStats;
    expect(s.total).toBe(5);
    expect(s.accepted).toBe(2);
    expect(s.declined).toBe(1);
    expect(s.maybe).toBe(1);
    expect(s.pending).toBe(1);
  });

  it("filters by status", async () => {
    const h = await setupHostWithRsvps();
    const r = await runQuery<{ eventInviteesList: { rsvp_status: string }[] }>(LIST, {
      variables: { eventId: h.eventId, status: "accepted" },
      authToken: h.token,
      context: CTX,
    });
    const list = expectOk(r).eventInviteesList;
    expect(list).toHaveLength(2);
    expect(list.every((i) => i.rsvp_status === "accepted")).toBe(true);
  });

  it("searches by name", async () => {
    const h = await setupHostWithRsvps();
    const r = await runQuery<{ eventInviteesList: { primary_first_name: string }[] }>(LIST, {
      variables: { eventId: h.eventId, search: "alice" },
      authToken: h.token,
      context: CTX,
    });
    const list = expectOk(r).eventInviteesList;
    expect(list).toHaveLength(1);
    expect(list[0]?.primary_first_name).toBe("Alice");
  });

  it("sorts by name asc", async () => {
    const h = await setupHostWithRsvps();
    const r = await runQuery<{ eventInviteesList: { primary_last_name: string }[] }>(LIST, {
      variables: { eventId: h.eventId, sort: "name", direction: "asc" },
      authToken: h.token,
      context: CTX,
    });
    const last = expectOk(r).eventInviteesList.map((i) => i.primary_last_name);
    expect(last).toEqual(["Adams", "Brown", "Jones", "Smith", "Zeta"]);
  });

  it("exports an XLSX file with the right rows", async () => {
    const h = await setupHostWithRsvps();
    const r = await runQuery<{ exportInvitees: { filename: string; base64: string } }>(EXPORT, {
      variables: { eventId: h.eventId },
      authToken: h.token,
      context: CTX,
    });
    const exp = expectOk(r).exportInvitees;
    expect(exp.filename).toMatch(/\.xlsx$/);

    const buf = Buffer.from(exp.base64, "base64");
    const wb = XLSX.read(buf);
    const sheet = wb.Sheets[wb.SheetNames[0]!]!;
    const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet);
    expect(rows).toHaveLength(5);
    expect(rows.some((r) => r["first_name"] === "Alice" && r["status"] === "accepted")).toBe(true);
  });
});
