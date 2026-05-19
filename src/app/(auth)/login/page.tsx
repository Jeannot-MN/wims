import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="card">
      <h1 className="font-display text-3xl mb-2">Welcome back</h1>
      <p className="text-ink/60 mb-6 text-sm">Log in to manage your events.</p>
      <LoginForm />
    </div>
  );
}
