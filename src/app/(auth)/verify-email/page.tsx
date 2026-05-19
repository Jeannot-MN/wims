import { Suspense } from "react";
import { VerifyClient } from "./verify-client";

export default function VerifyEmailPage() {
  return (
    <div className="card">
      <h1 className="font-display text-3xl mb-4">Verifying your email…</h1>
      <Suspense fallback={<p className="text-ink/60 text-sm">Loading…</p>}>
        <VerifyClient />
      </Suspense>
    </div>
  );
}
