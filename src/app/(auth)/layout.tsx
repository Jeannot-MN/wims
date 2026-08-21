import Link from "next/link";
import { AppFooter } from "@/web/client/app-footer";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="px-6 py-4">
        <Link href="/" className="font-display text-2xl text-ink">WIMS</Link>
      </header>
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">{children}</div>
      </main>
      <AppFooter />
    </div>
  );
}
