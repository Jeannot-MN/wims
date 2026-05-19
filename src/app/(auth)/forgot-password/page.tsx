import { ForgotPasswordForm } from "./forgot-form";

export default function ForgotPasswordPage() {
  return (
    <div className="card">
      <h1 className="font-display text-3xl mb-2">Forgot password</h1>
      <p className="text-ink/60 mb-6 text-sm">
        Enter your email and we&apos;ll send you a reset link.
      </p>
      <ForgotPasswordForm />
    </div>
  );
}
