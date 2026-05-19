"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { gql, GraphQLRequestError } from "@/web/client/graphql-client";

const MUTATION = `mutation Verify($token: String!) { verifyEmail(token: $token) }`;

export function VerifyClient() {
  const params = useSearchParams();
  const token = params.get("token");
  const [state, setState] = useState<"loading" | "success" | "error">("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setState("error");
      setError("No verification token provided.");
      return;
    }
    (async () => {
      try {
        await gql(MUTATION, { token });
        setState("success");
      } catch (err) {
        setState("error");
        setError(err instanceof GraphQLRequestError ? err.message : "Verification failed");
      }
    })();
  }, [token]);

  if (state === "loading") return <p className="text-ink/60 text-sm">One moment…</p>;
  if (state === "success") {
    return (
      <div className="space-y-4">
        <p className="text-ink">Email verified. You can now log in.</p>
        <Link className="btn-primary" href="/login">Log in</Link>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <p className="text-rose text-sm">{error}</p>
      <Link className="btn-secondary" href="/login">Back to log in</Link>
    </div>
  );
}
