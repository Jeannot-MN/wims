import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { resetDatabase, setupDatabase, teardownDatabase } from "../helpers/test-db";
import { expectOk, runQuery } from "../helpers/gql";
import { CapturingEmailService } from "../helpers/email-capture";
import { futureEventStart } from "../helpers/dates";

const email = new CapturingEmailService();
const CTX = { email };

const SIGNUP = `mutation S($email: String!, $password: String!) { signup(email: $email, password: $password) { userId } }`;
const VERIFY = `mutation V($token: String!) { verifyEmail(token: $token) }`;
const LOGIN = `mutation L($email: String!, $password: String!) { login(email: $email, password: $password) { token user { id } } }`;

async function createUser(addr: string) {
  await runQuery(SIGNUP, { variables: { email: addr, password: "supersecret1" }, context: CTX });
  const token = email.lastVerificationTokenFor(addr);
  await runQuery(VERIFY, { variables: { token: token! }, context: CTX });
  const r = await runQuery<{ login: { token: string; user: { id: string } } }>(LOGIN, {
    variables: { email: addr, password: "supersecret1" },
    context: CTX,
  });
  const data = expectOk(r);
  return { token: data.login.token, userId: data.login.user.id };
}

const CREATE_EVENT = `
  mutation Create($input: EventCreateInput!) {
    createEvent(input: $input) {
      id title description starts_at ends_at rsvp_deadline_at is_rsvp_closed
      location { address_text place_id latitude longitude formatted_address }
      dress_code gift_registry_url cover_image_url
      schedule { time title description }
      custom_sections { heading body }
    }
  }
`;
const LIST_EVENTS = `query { events { id title } }`;
const GET_EVENT = `query Get($id: ID!) { event(id: $id) { id title } }`;
const UPDATE_EVENT = `mutation Up($id: ID!, $input: EventUpdateInput!) { updateEvent(id: $id, input: $input) { id title description } }`;
const DELETE_EVENT = `mutation Del($id: ID!) { deleteEvent(id: $id) }`;

describe("Phase 3 — events", () => {
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

  it("creates and reads an event with all extras", async () => {
    const me = await createUser("host@example.com");
    // Must stay ahead of the default RSVP deadline — this test asserts is_rsvp_closed is false.
    const start = futureEventStart();
    const starts = start.toISOString();
    const ends = new Date(start.getTime() + 7 * 60 * 60 * 1000).toISOString();
    const r = await runQuery<{ createEvent: { id: string; title: string; is_rsvp_closed: boolean } }>(
      CREATE_EVENT,
      {
        variables: {
          input: {
            title: "Our Wedding",
            description: "Join us!",
            starts_at: starts,
            ends_at: ends,
            location: { address_text: "Cape Town", latitude: -33.92, longitude: 18.42 },
            dress_code: "Black tie",
            gift_registry_url: "https://example.com/registry",
            schedule: [{ time: "15:00", title: "Ceremony", description: "Begins" }],
            custom_sections: [{ heading: "Accommodation", body: "Hotel info" }],
          },
        },
        authToken: me.token,
        context: CTX,
      },
    );
    const data = expectOk(r);
    expect(data.createEvent.title).toBe("Our Wedding");
    expect(data.createEvent.is_rsvp_closed).toBe(false);

    const list = await runQuery<{ events: { id: string; title: string }[] }>(LIST_EVENTS, {
      authToken: me.token,
      context: CTX,
    });
    expect(expectOk(list).events).toHaveLength(1);

    const single = await runQuery<{ event: { id: string; title: string } }>(GET_EVENT, {
      variables: { id: data.createEvent.id },
      authToken: me.token,
      context: CTX,
    });
    expect(expectOk(single).event.title).toBe("Our Wedding");
  });

  it("applies default RSVP deadline (30 days before start)", async () => {
    const me = await createUser("default@example.com");
    const starts = new Date("2026-09-15T15:00:00Z");
    const r = await runQuery<{ createEvent: { rsvp_deadline_at: string } }>(CREATE_EVENT, {
      variables: { input: { title: "T", starts_at: starts.toISOString() } },
      authToken: me.token,
      context: CTX,
    });
    const deadline = new Date(expectOk(r).createEvent.rsvp_deadline_at);
    expect(deadline.toISOString().slice(0, 10)).toBe("2026-08-16");
  });

  it("isolates events across users", async () => {
    const alice = await createUser("alice@example.com");
    const bob = await createUser("bob@example.com");
    const create = await runQuery<{ createEvent: { id: string } }>(CREATE_EVENT, {
      variables: { input: { title: "Alice's wedding", starts_at: new Date("2026-09-15T15:00:00Z").toISOString() } },
      authToken: alice.token,
      context: CTX,
    });
    const eventId = expectOk(create).createEvent.id;

    const bobList = await runQuery<{ events: unknown[] }>(LIST_EVENTS, {
      authToken: bob.token,
      context: CTX,
    });
    expect(expectOk(bobList).events).toHaveLength(0);

    const bobGet = await runQuery(GET_EVENT, { variables: { id: eventId }, authToken: bob.token, context: CTX });
    expect(bobGet.errors?.[0]?.message).toMatch(/forbidden/i);

    const bobUpdate = await runQuery(UPDATE_EVENT, {
      variables: { id: eventId, input: { title: "Hijacked" } },
      authToken: bob.token,
      context: CTX,
    });
    expect(bobUpdate.errors?.[0]?.message).toMatch(/forbidden/i);

    const bobDel = await runQuery(DELETE_EVENT, { variables: { id: eventId }, authToken: bob.token, context: CTX });
    expect(bobDel.errors?.[0]?.message).toMatch(/forbidden/i);
  });

  it("updates and deletes own events", async () => {
    const me = await createUser("editor@example.com");
    const create = await runQuery<{ createEvent: { id: string } }>(CREATE_EVENT, {
      variables: { input: { title: "Old", starts_at: new Date("2026-09-15T15:00:00Z").toISOString() } },
      authToken: me.token,
      context: CTX,
    });
    const id = expectOk(create).createEvent.id;

    const upd = await runQuery<{ updateEvent: { title: string } }>(UPDATE_EVENT, {
      variables: { id, input: { title: "New", description: "Updated copy" } },
      authToken: me.token,
      context: CTX,
    });
    expect(expectOk(upd).updateEvent.title).toBe("New");

    const del = await runQuery(DELETE_EVENT, { variables: { id }, authToken: me.token, context: CTX });
    expectOk(del);

    const after = await runQuery<{ events: unknown[] }>(LIST_EVENTS, { authToken: me.token, context: CTX });
    expect(expectOk(after).events).toHaveLength(0);
  });

  it("rejects unauthenticated event queries", async () => {
    const r = await runQuery(LIST_EVENTS, { context: CTX });
    expect(r.errors?.[0]?.message).toMatch(/authentication/i);
  });

  it("rejects RSVP deadline after start", async () => {
    const me = await createUser("badlydated@example.com");
    const r = await runQuery(CREATE_EVENT, {
      variables: {
        input: {
          title: "Bad",
          starts_at: new Date("2026-09-15T15:00:00Z").toISOString(),
          rsvp_deadline_at: new Date("2026-09-16T15:00:00Z").toISOString(),
        },
      },
      authToken: me.token,
      context: CTX,
    });
    expect(r.errors?.[0]?.message).toMatch(/deadline/i);
  });
});
