import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { resetDatabase, setupDatabase, teardownDatabase } from "../helpers/test-db";
import { expectOk, runQuery } from "../helpers/gql";
import { CapturingEmailService } from "../helpers/email-capture";

const email = new CapturingEmailService();

const CTX = { email, currentUser: null };

const SIGNUP = `
  mutation Signup($email: String!, $password: String!) {
    signup(email: $email, password: $password) { userId }
  }
`;
const VERIFY = `
  mutation Verify($token: String!) { verifyEmail(token: $token) }
`;
const LOGIN = `
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      token
      user { id email }
    }
  }
`;
const ME = `query { me { id email } }`;

describe("Phase 1 — auth", () => {
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

  it("rejects login before email verification", async () => {
    const signup = await runQuery(SIGNUP, {
      variables: { email: "alice@example.com", password: "supersecret1" },
      context: CTX,
    });
    expectOk(signup);
    const login = await runQuery(LOGIN, {
      variables: { email: "alice@example.com", password: "supersecret1" },
      context: CTX,
    });
    expect(login.errors?.[0]?.message).toMatch(/verify/i);
  });

  it("full signup → verify → login → me flow", async () => {
    const signup = await runQuery(SIGNUP, {
      variables: { email: "bob@example.com", password: "supersecret1" },
      context: CTX,
    });
    expectOk(signup);
    const token = email.lastVerificationTokenFor("bob@example.com");
    expect(token).toBeTruthy();

    const verify = await runQuery(VERIFY, {
      variables: { token: token! },
      context: CTX,
    });
    expectOk(verify);

    const login = await runQuery<{ login: { token: string; user: { id: string; email: string } } }>(
      LOGIN,
      {
        variables: { email: "bob@example.com", password: "supersecret1" },
        context: CTX,
      },
    );
    const loginData = expectOk(login);
    expect(loginData.login.token).toBeTruthy();
    expect(loginData.login.user.email).toBe("bob@example.com");

    const me = await runQuery<{ me: { email: string } | null }>(ME, {
      authToken: loginData.login.token,
      context: { email },
    });
    const meData = expectOk(me);
    expect(meData.me?.email).toBe("bob@example.com");
  });

  it("rejects wrong password", async () => {
    await signupAndVerify("carol@example.com", "supersecret1");
    const login = await runQuery(LOGIN, {
      variables: { email: "carol@example.com", password: "wrongpassword" },
      context: CTX,
    });
    expect(login.errors?.[0]?.message).toMatch(/invalid email or password/i);
  });

  it("rejects duplicate signup", async () => {
    await runQuery(SIGNUP, {
      variables: { email: "dave@example.com", password: "supersecret1" },
      context: CTX,
    });
    const dup = await runQuery(SIGNUP, {
      variables: { email: "dave@example.com", password: "supersecret1" },
      context: CTX,
    });
    expect(dup.errors?.[0]?.message).toMatch(/already exists/i);
  });

  it("rejects me without auth token", async () => {
    const me = await runQuery<{ me: unknown }>(ME, { context: CTX });
    const data = expectOk(me);
    expect(data.me).toBeNull();
  });

  it("rejects expired/invalid verification token", async () => {
    const r = await runQuery(VERIFY, {
      variables: { token: "definitely-not-a-real-token" },
      context: CTX,
    });
    expect(r.errors?.[0]?.message).toMatch(/invalid|expired/i);
  });

  async function signupAndVerify(emailAddr: string, password: string) {
    await runQuery(SIGNUP, { variables: { email: emailAddr, password }, context: CTX });
    const token = email.lastVerificationTokenFor(emailAddr);
    await runQuery(VERIFY, { variables: { token: token! }, context: CTX });
  }
});

describe("Phase 2 — password reset", () => {
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

  const REQUEST_RESET = `mutation Req($email: String!) { requestPasswordReset(email: $email) }`;
  const RESET = `mutation Reset($token: String!, $newPassword: String!) { resetPassword(token: $token, newPassword: $newPassword) }`;

  async function signupAndVerify(emailAddr: string, password: string) {
    await runQuery(SIGNUP, { variables: { email: emailAddr, password }, context: CTX });
    const token = email.lastVerificationTokenFor(emailAddr);
    await runQuery(VERIFY, { variables: { token: token! }, context: CTX });
  }

  it("happy path — request + reset + login with new password", async () => {
    await signupAndVerify("eve@example.com", "oldpassword1");
    const req = await runQuery(REQUEST_RESET, { variables: { email: "eve@example.com" }, context: CTX });
    expectOk(req);
    const token = email.lastResetTokenFor("eve@example.com");
    expect(token).toBeTruthy();

    const reset = await runQuery(RESET, { variables: { token: token!, newPassword: "newpassword2" }, context: CTX });
    expectOk(reset);

    const loginNew = await runQuery(LOGIN, {
      variables: { email: "eve@example.com", password: "newpassword2" },
      context: CTX,
    });
    expectOk(loginNew);

    const loginOld = await runQuery(LOGIN, {
      variables: { email: "eve@example.com", password: "oldpassword1" },
      context: CTX,
    });
    expect(loginOld.errors?.[0]?.message).toMatch(/invalid/i);
  });

  it("request for unknown email returns success (no enumeration)", async () => {
    const r = await runQuery(REQUEST_RESET, { variables: { email: "ghost@example.com" }, context: CTX });
    expectOk(r);
    expect(email.lastResetTokenFor("ghost@example.com")).toBeNull();
  });

  it("reset tokens cannot be reused", async () => {
    await signupAndVerify("frank@example.com", "oldpassword1");
    await runQuery(REQUEST_RESET, { variables: { email: "frank@example.com" }, context: CTX });
    const token = email.lastResetTokenFor("frank@example.com");
    await runQuery(RESET, { variables: { token: token!, newPassword: "newpassword2" }, context: CTX });

    const reused = await runQuery(RESET, {
      variables: { token: token!, newPassword: "anotherpw3" },
      context: CTX,
    });
    expect(reused.errors?.[0]?.message).toMatch(/invalid|expired/i);
  });
});
