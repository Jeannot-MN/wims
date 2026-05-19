import { Suspense } from "react";
import { ResetForm } from "./reset-form";

export default function ResetPasswordPage() {
  return (
    <div className="card">
      <h1 className="font-display text-3xl mb-2">Reset password</h1>
      <p className="text-ink/60 mb-6 text-sm">Choose a new password.</p>
      <Suspense fallback={<p className="text-ink/60 text-sm">Loading…</p>}>
        <ResetForm />
      </Suspense>
    </div>
  );
}
