import Link from "next/link";
import { AppFooter } from "@/web/client/app-footer";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 mx-auto w-full max-w-3xl px-6 py-20">
        <h1 className="font-display text-5xl text-ink">WIMS</h1>
        <p className="mt-3 text-lg text-ink/70">
          Wedding Invite Management System — host any event, manage your guest list, and track RSVPs.
        </p>

        <div className="mt-10 flex gap-3">
          <Link className="btn-primary" href="/signup">Get started</Link>
          <Link className="btn-secondary" href="/login">Log in</Link>
        </div>

        <p className="mt-16 text-sm text-ink/60">
          GraphQL playground:{" "}
          <Link className="underline" href="/api/graphql">/api/graphql</Link>
        </p>
      </main>
      <AppFooter />
    </div>
  );
}
