"use client";

import { useState } from "react";
import Link from "next/link";
import { gql, GraphQLRequestError } from "@/web/client/graphql-client";

const MUTATION = `
  mutation Signup($email: String!, $password: String!) {
    signup(email: $email, password: $password) { userId }
  }
`;

export function SignupForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await gql<{ signup: { userId: string } }>(MUTATION, { email, password });
      setDone(true);
    } catch (err) {
      setError(err instanceof GraphQLRequestError ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="space-y-4 text-sm">
        <p className="text-ink">
          Almost there! We sent a verification link to <strong>{email}</strong>. Open it to activate your account.
        </p>
        <p className="text-ink/60">
          In dev mode, you can read the email body in the <code>sent_emails</code> table.
        </p>
        <Link className="btn-secondary" href="/login">Back to log in</Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="label" htmlFor="email">Email</label>
        <input id="email" className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div>
        <label className="label" htmlFor="password">Password</label>
        <input id="password" className="input" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
        <p className="mt-1 text-xs text-ink/50">At least 8 characters.</p>
      </div>
      {error && <p className="text-sm text-rose">{error}</p>}
      <button className="btn-primary w-full" type="submit" disabled={busy}>
        {busy ? "Creating…" : "Create account"}
      </button>
      <p className="text-sm text-ink/60">
        Already have an account? <Link className="underline" href="/login">Log in</Link>
      </p>
    </form>
  );
}
