import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { resetDatabase, setupDatabase, teardownDatabase } from "../helpers/test-db";
import { expectOk, runQuery } from "../helpers/gql";
import { CapturingEmailService } from "../helpers/email-capture";
import { futureEventStart } from "../helpers/dates";
import { resetRsvpRateLimit } from "@/application/services/rsvp-service";

const email = new CapturingEmailService();
const CTX = { email };

const SIGNUP = `mutation S($email: String!, $password: String!) { signup(email: $email, password: $password) { userId } }`;
const VERIFY = `mutation V($token: String!) { verifyEmail(token: $token) }`;
const LOGIN = `mutation L($email: String!, $password: String!) { login(email: $email, password: $password) { token } }`;
const CREATE_EVENT = `mutation Create($input: EventCreateInput!) { createEvent(input: $input) { id } }`;
const ADD_INVITEE = `mutation Add($eventId: ID!, $input: InviteeInput!) { addInvitee(eventId: $eventId, input: $input) { invite_token } }`;
const INVITE = `
  query I($token: String!) {
    invite(token: $token) {
      event { title rsvp_deadline_at location { maps_url } }
      invitee { primary_first_name is_couple partner_first_name }
      rsvp { status dietary_restrictions song_requests accommodation_needed }
      is_rsvp_closed
      deadline
    }
  }
`;
const SUBMIT = `
  mutation Sub($token: String!, $input: SubmitRsvpInput!) {
    submitRsvp(token: $token, input: $input) {
      rsvp { status dietary_restrictions song_requests accommodation_needed }
      invitee { partner_first_name }
    }
  }
`;

async function setupInviteeFor(addr: string, deadline?: string, partner?: { first: string; last: string }) {
  await runQuery(SIGNUP, { variables: { email: addr, password: "supersecret1" }, context: CTX });
  const t = email.lastVerificationTokenFor(addr);
  await runQuery(VERIFY, { variables: { token: t! }, context: CTX });
  const login = await runQuery<{ login: { token: string } }>(LOGIN, {
    variables: { email: addr, password: "supersecret1" },
    context: CTX,
  });
  const token = expectOk(login).login.token;
  const evt = await runQuery<{ createEvent: { id: string } }>(CREATE_EVENT, {
    variables: {
      input: {
        title: "Wedding",
        starts_at: futureEventStart().toISOString(),
        rsvp_deadline_at: deadline ?? null,
      },
    },
    authToken: token,
    context: CTX,
  });
  const eventId = expectOk(evt).createEvent.id;
  const inviteeInput: Record<string, unknown> = {
    primary_first_name: "Alice",
    primary_last_name: "Smith",
    email: "alice@invitee.com",
  };
  if (partner) {
    inviteeInput.partner_first_name = partner.first;
    inviteeInput.partner_last_name = partner.last;
  }
  const inv = await runQuery<{ addInvitee: { invite_token: string } }>(ADD_INVITEE, {
    variables: { eventId, input: inviteeInput },
    authToken: token,
    context: CTX,
  });
  return { inviteToken: expectOk(inv).addInvitee.invite_token, hostToken: token };
}

describe("Phase 8 + 9 — public invite + RSVP", () => {
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

  it("returns the public invite view without auth", async () => {
    const { inviteToken } = await setupInviteeFor("rsvp1@example.com");
    const r = await runQuery<{
      invite: { event: { title: string; location: { maps_url: string } }; rsvp: { status: string } };
    }>(INVITE, { variables: { token: inviteToken }, context: CTX });
    const data = expectOk(r);
    expect(data.invite.event.title).toBe("Wedding");
    expect(data.invite.rsvp.status).toBe("pending");
    expect(data.invite.event.location.maps_url).toContain("google.com/maps");
  });

  it("returns null for invalid token", async () => {
    const r = await runQuery<{ invite: null }>(INVITE, { variables: { token: "doesnotexist" }, context: CTX });
    const data = expectOk(r);
    expect(data.invite).toBeNull();
  });

  it("submits accept with extras and returns updated state", async () => {
    const { inviteToken } = await setupInviteeFor("rsvp2@example.com");
    const r = await runQuery<{
      submitRsvp: { rsvp: { status: string; dietary_restrictions: string; song_requests: string; accommodation_needed: boolean } };
    }>(SUBMIT, {
      variables: {
        token: inviteToken,
        input: {
          status: "accepted",
          dietary_restrictions: "vegetarian",
          song_requests: "Africa - Toto",
          accommodation_needed: true,
        },
      },
      context: CTX,
    });
    const data = expectOk(r);
    expect(data.submitRsvp.rsvp.status).toBe("accepted");
    expect(data.submitRsvp.rsvp.dietary_restrictions).toBe("vegetarian");
    expect(data.submitRsvp.rsvp.song_requests).toContain("Toto");
    expect(data.submitRsvp.rsvp.accommodation_needed).toBe(true);
  });

  it("changes RSVP before deadline", async () => {
    const { inviteToken } = await setupInviteeFor("rsvp3@example.com");
    await runQuery(SUBMIT, {
      variables: { token: inviteToken, input: { status: "accepted" } },
      context: CTX,
    });
    const r = await runQuery<{ submitRsvp: { rsvp: { status: string } } }>(SUBMIT, {
      variables: { token: inviteToken, input: { status: "declined" } },
      context: CTX,
    });
    expect(expectOk(r).submitRsvp.rsvp.status).toBe("declined");
  });

  it("rejects RSVP after deadline", async () => {
    const past = new Date("2026-05-10T00:00:00Z").toISOString();
    const { inviteToken } = await setupInviteeFor("rsvp4@example.com", past);
    const r = await runQuery(SUBMIT, {
      variables: { token: inviteToken, input: { status: "accepted" } },
      context: CTX,
    });
    expect((r.errors?.[0]?.extensions as { code?: string })?.code).toBe("RSVP_CLOSED");
  });

  it("supports couple RSVP with partner name correction", async () => {
    const { inviteToken } = await setupInviteeFor("rsvp5@example.com", undefined, {
      first: "Robert",
      last: "Smith",
    });
    const r = await runQuery<{ submitRsvp: { invitee: { partner_first_name: string } } }>(SUBMIT, {
      variables: {
        token: inviteToken,
        input: { status: "accepted", partner_first_name: "Bob" },
      },
      context: CTX,
    });
    expect(expectOk(r).submitRsvp.invitee.partner_first_name).toBe("Bob");
  });

  it("returns is_rsvp_closed=true after deadline in invite view", async () => {
    const past = new Date("2026-05-10T00:00:00Z").toISOString();
    const { inviteToken } = await setupInviteeFor("rsvp6@example.com", past);
    const r = await runQuery<{ invite: { is_rsvp_closed: boolean } }>(INVITE, {
      variables: { token: inviteToken },
      context: CTX,
    });
    expect(expectOk(r).invite.is_rsvp_closed).toBe(true);
  });

  it("sends a confirmation email when invitee has an email", async () => {
    const { inviteToken } = await setupInviteeFor("rsvp7@example.com");
    email.reset();
    await runQuery(SUBMIT, {
      variables: { token: inviteToken, input: { status: "maybe" } },
      context: CTX,
    });
    const conf = email.emails.find((e) => e.kind === "rsvp_confirmation");
    expect(conf).toBeTruthy();
  });
});
