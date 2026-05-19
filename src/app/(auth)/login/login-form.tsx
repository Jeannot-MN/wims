"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { gql, GraphQLRequestError } from "@/web/client/graphql-client";
import { saveToken } from "@/web/client/auth-storage";

const MUTATION = `
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      token
      expiresAt
      user { id email }
    }
  }
`;

type LoginResponse = {
  login: { token: string; expiresAt: string; user: { id: string; email: string } };
};

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const data = await gql<LoginResponse>(MUTATION, { email, password });
      saveToken(data.login.token, new Date(data.login.expiresAt));
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof GraphQLRequestError ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="label" htmlFor="email">Email</label>
        <input id="email" className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div>
        <label className="label" htmlFor="password">Password</label>
        <input id="password" className="input" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      {error && <p className="text-sm text-rose">{error}</p>}
      <button className="btn-primary w-full" type="submit" disabled={busy}>
        {busy ? "Logging in…" : "Log in"}
      </button>
      <div className="flex justify-between text-sm">
        <Link className="underline" href="/signup">Create account</Link>
        <Link className="underline" href="/forgot-password">Forgot password?</Link>
      </div>
    </form>
  );
}
