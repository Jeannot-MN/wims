"use client";

import { useState } from "react";
import Link from "next/link";
import { gql, GraphQLRequestError } from "@/web/client/graphql-client";

const MUTATION = `mutation Req($email: String!) { requestPasswordReset(email: $email) }`;

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await gql(MUTATION, { email });
      setDone(true);
    } catch (err) {
      setError(err instanceof GraphQLRequestError ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="space-y-3 text-sm">
        <p>If an account exists for <strong>{email}</strong>, we sent a reset link.</p>
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
      {error && <p className="text-sm text-rose">{error}</p>}
      <button className="btn-primary w-full" type="submit" disabled={busy}>
        {busy ? "Sending…" : "Send reset link"}
      </button>
    </form>
  );
}
