import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { resetDatabase, setupDatabase, teardownDatabase } from "../helpers/test-db";
import { expectOk, runQuery } from "../helpers/gql";
import { CapturingEmailService } from "../helpers/email-capture";

const email = new CapturingEmailService();
const CTX = { email };

const SIGNUP = `mutation S($email: String!, $password: String!) { signup(email: $email, password: $password) { userId } }`;
const VERIFY = `mutation V($token: String!) { verifyEmail(token: $token) }`;
const LOGIN = `mutation L($email: String!, $password: String!) { login(email: $email, password: $password) { token } }`;
const CREATE_EVENT = `mutation Create($input: EventCreateInput!) { createEvent(input: $input) { id } }`;
const ADD_INVITEE = `mutation Add($eventId: ID!, $input: InviteeInput!) { addInvitee(eventId: $eventId, input: $input) { id invite_token } }`;
const PDF = `query P($id: ID!) { inviteePdf(inviteeId: $id) { filename base64 } }`;

describe("Phase 11 — PDF", () => {
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

  it("renders a PDF for an invitee", async () => {
    await runQuery(SIGNUP, { variables: { email: "pdf@example.com", password: "supersecret1" }, context: CTX });
    const t = email.lastVerificationTokenFor("pdf@example.com");
    await runQuery(VERIFY, { variables: { token: t! }, context: CTX });
    const login = await runQuery<{ login: { token: string } }>(LOGIN, {
      variables: { email: "pdf@example.com", password: "supersecret1" },
      context: CTX,
    });
    const token = expectOk(login).login.token;
    const evt = await runQuery<{ createEvent: { id: string } }>(CREATE_EVENT, {
      variables: {
        input: {
          title: "Alice & Bob's Wedding",
          starts_at: new Date("2026-09-15T15:00:00Z").toISOString(),
          location: { address_text: "Cape Town", latitude: -33.92, longitude: 18.42 },
          dress_code: "Black tie",
          schedule: [{ time: "15:00", title: "Ceremony", description: "" }],
        },
      },
      authToken: token,
      context: CTX,
    });
    const eventId = expectOk(evt).createEvent.id;

    const inv = await runQuery<{ addInvitee: { id: string; invite_token: string } }>(ADD_INVITEE, {
      variables: {
        eventId,
        input: { primary_first_name: "Carol", primary_last_name: "Brown", email: "carol@c.com" },
      },
      authToken: token,
      context: CTX,
    });
    const inviteeId = expectOk(inv).addInvitee.id;

    const pdf = await runQuery<{ inviteePdf: { filename: string; base64: string } }>(PDF, {
      variables: { id: inviteeId },
      authToken: token,
      context: CTX,
    });
    const data = expectOk(pdf);
    expect(data.inviteePdf.filename).toMatch(/\.pdf$/);
    const buf = Buffer.from(data.inviteePdf.base64, "base64");
    expect(buf.length).toBeGreaterThan(1000);
    // PDF files always start with %PDF
    expect(buf.subarray(0, 4).toString()).toBe("%PDF");
  });

  it("rejects PDF for other user's invitee", async () => {
    await runQuery(SIGNUP, { variables: { email: "owner@example.com", password: "supersecret1" }, context: CTX });
    let t = email.lastVerificationTokenFor("owner@example.com");
    await runQuery(VERIFY, { variables: { token: t! }, context: CTX });
    const ownerLogin = await runQuery<{ login: { token: string } }>(LOGIN, {
      variables: { email: "owner@example.com", password: "supersecret1" },
      context: CTX,
    });
    const ownerToken = expectOk(ownerLogin).login.token;

    await runQuery(SIGNUP, { variables: { email: "intruder@example.com", password: "supersecret1" }, context: CTX });
    t = email.lastVerificationTokenFor("intruder@example.com");
    await runQuery(VERIFY, { variables: { token: t! }, context: CTX });
    const intruderLogin = await runQuery<{ login: { token: string } }>(LOGIN, {
      variables: { email: "intruder@example.com", password: "supersecret1" },
      context: CTX,
    });
    const intruderToken = expectOk(intruderLogin).login.token;

    const evt = await runQuery<{ createEvent: { id: string } }>(CREATE_EVENT, {
      variables: { input: { title: "T", starts_at: new Date("2026-09-15T15:00:00Z").toISOString() } },
      authToken: ownerToken,
      context: CTX,
    });
    const eventId = expectOk(evt).createEvent.id;
    const inv = await runQuery<{ addInvitee: { id: string } }>(ADD_INVITEE, {
      variables: { eventId, input: { primary_first_name: "A", primary_last_name: "B" } },
      authToken: ownerToken,
      context: CTX,
    });
    const inviteeId = expectOk(inv).addInvitee.id;

    const r = await runQuery(PDF, { variables: { id: inviteeId }, authToken: intruderToken, context: CTX });
    expect(r.errors?.[0]?.message).toMatch(/forbidden/i);
  });
});
