"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { clearToken, loadToken } from "@/web/client/auth-storage";
import { gql } from "@/web/client/graphql-client";

const ME = `query { me { email } }`;

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = loadToken();
    if (!t) {
      router.replace("/login");
      return;
    }
    (async () => {
      try {
        const data = await gql<{ me: { email: string } | null }>(ME);
        if (data.me) {
          setEmail(data.me.email);
          setReady(true);
        } else {
          router.replace("/login");
        }
      } catch {
        router.replace("/login");
      }
    })();
  }, [router]);

  const logout = () => {
    clearToken();
    router.replace("/login");
  };

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center text-ink/50 text-sm">
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-ink/10 bg-white">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <Link href="/dashboard" className="font-display text-2xl">WIMS</Link>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-ink/60">{email}</span>
            <button className="btn-ghost text-sm" onClick={logout}>Log out</button>
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-8">{children}</main>
    </div>
  );
}
