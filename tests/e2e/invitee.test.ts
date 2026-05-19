import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { resetDatabase, setupDatabase, teardownDatabase } from "../helpers/test-db";
import { expectOk, runQuery } from "../helpers/gql";
import { CapturingEmailService } from "../helpers/email-capture";

const email = new CapturingEmailService();
const CTX = { email };

const SIGNUP = `mutation S($email: String!, $password: String!) { signup(email: $email, password: $password) { userId } }`;
const VERIFY = `mutation V($token: String!) { verifyEmail(token: $token) }`;
const LOGIN = `mutation L($email: String!, $password: String!) { login(email: $email, password: $password) { token user { id } } }`;
const CREATE_EVENT = `mutation Create($input: EventCreateInput!) { createEvent(input: $input) { id } }`;
const ADD_INVITEE = `
  mutation Add($eventId: ID!, $input: InviteeInput!) {
    addInvitee(eventId: $eventId, input: $input) {
      id invite_token invite_url
      primary_first_name primary_last_name
      partner_first_name partner_last_name
      is_couple email mobile_no
    }
  }
`;
const LIST_INVITEES = `query Q($eventId: ID!) { eventInvitees(eventId: $eventId) { id invite_token } }`;
const UPDATE_INVITEE = `mutation Up($id: ID!, $input: InviteeUpdateInput!) { updateInvitee(id: $id, input: $input) { id email } }`;
const DELETE_INVITEE = `mutation Del($id: ID!) { deleteInvitee(id: $id) }`;

async function setupHost(addr: string) {
  await runQuery(SIGNUP, { variables: { email: addr, password: "supersecret1" }, context: CTX });
  const t = email.lastVerificationTokenFor(addr);
  await runQuery(VERIFY, { variables: { token: t! }, context: CTX });
  const login = await runQuery<{ login: { token: string; user: { id: string } } }>(LOGIN, {
    variables: { email: addr, password: "supersecret1" },
    context: CTX,
  });
  const token = expectOk(login).login.token;
  const evt = await runQuery<{ createEvent: { id: string } }>(CREATE_EVENT, {
    variables: { input: { title: "Wedding", starts_at: new Date("2026-09-15T15:00:00Z").toISOString() } },
    authToken: token,
    context: CTX,
  });
  return { token, eventId: expectOk(evt).createEvent.id };
}

describe("Phase 6 — invitees", () => {
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

  it("adds an individual invitee and exposes a unique URL", async () => {
    const h = await setupHost("host1@example.com");
    const r = await runQuery<{ addInvitee: { invite_token: string; invite_url: string; is_couple: boolean } }>(
      ADD_INVITEE,
      {
        variables: {
          eventId: h.eventId,
          input: {
            primary_first_name: "Alice",
            primary_last_name: "Smith",
            email: "alice@example.com",
          },
        },
        authToken: h.token,
        context: CTX,
      },
    );
    const data = expectOk(r);
    expect(data.addInvitee.invite_token).toHaveLength(10);
    expect(data.addInvitee.is_couple).toBe(false);
    expect(data.addInvitee.invite_url).toContain(data.addInvitee.invite_token);
  });

  it("adds a couple invite with shared token", async () => {
    const h = await setupHost("host2@example.com");
    const r = await runQuery<{ addInvitee: { is_couple: boolean; partner_first_name: string } }>(ADD_INVITEE, {
      variables: {
        eventId: h.eventId,
        input: {
          primary_first_name: "Alice",
          primary_last_name: "Smith",
          partner_first_name: "Bob",
          partner_last_name: "Smith",
        },
      },
      authToken: h.token,
      context: CTX,
    });
    const data = expectOk(r);
    expect(data.addInvitee.is_couple).toBe(true);
    expect(data.addInvitee.partner_first_name).toBe("Bob");
  });

  it("rejects invitee with no name", async () => {
    const h = await setupHost("host3@example.com");
    const r = await runQuery(ADD_INVITEE, {
      variables: {
        eventId: h.eventId,
        input: { primary_first_name: "", primary_last_name: "Smith" },
      },
      authToken: h.token,
      context: CTX,
    });
    expect(r.errors?.[0]?.message).toMatch(/name|invalid/i);
  });

  it("rejects invalid email format", async () => {
    const h = await setupHost("host4@example.com");
    const r = await runQuery(ADD_INVITEE, {
      variables: {
        eventId: h.eventId,
        input: { primary_first_name: "A", primary_last_name: "B", email: "not-an-email" },
      },
      authToken: h.token,
      context: CTX,
    });
    expect(r.errors?.[0]?.message).toMatch(/email|invalid/i);
  });

  it("updates and deletes invitees", async () => {
    const h = await setupHost("host5@example.com");
    const add = await runQuery<{ addInvitee: { id: string } }>(ADD_INVITEE, {
      variables: {
        eventId: h.eventId,
        input: { primary_first_name: "A", primary_last_name: "B" },
      },
      authToken: h.token,
      context: CTX,
    });
    const id = expectOk(add).addInvitee.id;

    const upd = await runQuery<{ updateInvitee: { email: string } }>(UPDATE_INVITEE, {
      variables: { id, input: { email: "newaddr@example.com" } },
      authToken: h.token,
      context: CTX,
    });
    expect(expectOk(upd).updateInvitee.email).toBe("newaddr@example.com");

    const del = await runQuery(DELETE_INVITEE, { variables: { id }, authToken: h.token, context: CTX });
    expectOk(del);

    const list = await runQuery<{ eventInvitees: unknown[] }>(LIST_INVITEES, {
      variables: { eventId: h.eventId },
      authToken: h.token,
      context: CTX,
    });
    expect(expectOk(list).eventInvitees).toHaveLength(0);
  });

  it("rejects cross-user invitee access", async () => {
    const alice = await setupHost("alice-host@example.com");
    const bob = await setupHost("bob-host@example.com");
    const add = await runQuery<{ addInvitee: { id: string } }>(ADD_INVITEE, {
      variables: {
        eventId: alice.eventId,
        input: { primary_first_name: "A", primary_last_name: "B" },
      },
      authToken: alice.token,
      context: CTX,
    });
    const id = expectOk(add).addInvitee.id;

    const bobList = await runQuery(LIST_INVITEES, {
      variables: { eventId: alice.eventId },
      authToken: bob.token,
      context: CTX,
    });
    expect(bobList.errors?.[0]?.message).toMatch(/forbidden/i);

    const bobUpdate = await runQuery(UPDATE_INVITEE, {
      variables: { id, input: { email: "hijacked@evil.com" } },
      authToken: bob.token,
      context: CTX,
    });
    expect(bobUpdate.errors?.[0]?.message).toMatch(/forbidden/i);
  });

  it("warns are not errors — missing email and phone is allowed", async () => {
    const h = await setupHost("host7@example.com");
    const r = await runQuery(ADD_INVITEE, {
      variables: {
        eventId: h.eventId,
        input: { primary_first_name: "Grandma", primary_last_name: "Doe" },
      },
      authToken: h.token,
      context: CTX,
    });
    expectOk(r);
  });
});
