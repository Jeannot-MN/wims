const PHONE = "+27 81 075 9538";
const TEL = "tel:+27810759538";

/**
 * The credit line itself, so the app chrome and the guest invite's own
 * wedding footer share one source of truth for the wording and number.
 * Not a <footer> — it gets nested inside one on the invite page.
 */
export function DeveloperCredit({ tone = "light" }: { tone?: "light" | "dark" }) {
  const dark = tone === "dark";
  return (
    <p className={`text-center text-xs ${dark ? "text-white/50" : "text-ink/50"}`}>
      Developer: Jeannot MN (
      <a
        href={TEL}
        className={`transition-colors hover:underline ${dark ? "hover:text-white/80" : "hover:text-ink/80"}`}
      >
        {PHONE}
      </a>
      )
    </p>
  );
}

/** Bottom-of-page credit for the app chrome (landing, auth, dashboard). */
export function AppFooter() {
  return (
    <footer className="border-t border-ink/10 px-6 py-5">
      <DeveloperCredit />
    </footer>
  );
}
