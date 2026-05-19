"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { gql, GraphQLRequestError } from "@/web/client/graphql-client";

const MUTATION = `mutation Reset($token: String!, $newPassword: String!) { resetPassword(token: $token, newPassword: $newPassword) }`;

export function ResetForm() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await gql(MUTATION, { token, newPassword: password });
      setDone(true);
    } catch (err) {
      setError(err instanceof GraphQLRequestError ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  if (!token) {
    return <p className="text-rose text-sm">Missing reset token.</p>;
  }
  if (done) {
    return (
      <div className="space-y-3 text-sm">
        <p>Password updated.</p>
        <Link className="btn-primary" href="/login">Log in</Link>
      </div>
    );
  }
  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="label" htmlFor="password">New password</label>
        <input id="password" className="input" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      {error && <p className="text-sm text-rose">{error}</p>}
      <button className="btn-primary w-full" type="submit" disabled={busy}>
        {busy ? "Updating…" : "Update password"}
      </button>
    </form>
  );
}
