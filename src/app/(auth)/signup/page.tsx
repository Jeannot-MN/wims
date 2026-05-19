import { SignupForm } from "./signup-form";

export default function SignupPage() {
  return (
    <div className="card">
      <h1 className="font-display text-3xl mb-2">Create your account</h1>
      <p className="text-ink/60 mb-6 text-sm">Start managing your event invitations.</p>
      <SignupForm />
    </div>
  );
}
