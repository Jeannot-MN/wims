"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { gql, GraphQLRequestError } from "@/web/client/graphql-client";

const LIST = `
  query R($eventId: ID!) {
    eventInviteesList(eventId: $eventId, sort: "name") {
      id primary_first_name primary_last_name partner_first_name partner_last_name
      email mobile_no rsvp_status is_couple
      dietary_restrictions song_requests accommodation_needed
    }
  }
`;

type Row = {
  id: string;
  primary_first_name: string; primary_last_name: string;
  partner_first_name: string | null; partner_last_name: string | null;
  email: string | null; mobile_no: string | null;
  rsvp_status: string; is_couple: boolean;
  dietary_restrictions: string; song_requests: string; accommodation_needed: boolean;
};

const ATTENDING = ["accepted", "maybe"];

function guestName(r: Row): string {
  const primary = `${r.primary_first_name} ${r.primary_last_name}`.trim();
  if (!r.is_couple) return primary;
  return `${primary} & ${[r.partner_first_name, r.partner_last_name].filter(Boolean).join(" ")}`.trim();
}

export function RsvpDetailsClient({ eventId }: { eventId: string }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [includeAll, setIncludeAll] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    gql<{ eventInviteesList: Row[] }>(LIST, { eventId })
      .then((d) => setRows(d.eventInviteesList))
      .catch((e) => setError(e instanceof GraphQLRequestError ? e.message : "Load failed"));
  }, [eventId]);

  const { attendingCount, accommodation, dietary, songs } = useMemo(() => {
    const all = rows ?? [];
    const scoped = includeAll ? all : all.filter((r) => ATTENDING.includes(r.rsvp_status));
    return {
      attendingCount: all.filter((r) => ATTENDING.includes(r.rsvp_status)).length,
      accommodation: scoped.filter((r) => r.accommodation_needed),
      dietary: scoped.filter((r) => r.dietary_restrictions.trim() !== ""),
      songs: scoped.filter((r) => r.song_requests.trim() !== ""),
    };
  }, [rows, includeAll]);

  if (error) return <p className="text-rose text-sm">{error}</p>;
  if (!rows) return <p className="text-ink/60 text-sm">Loading…</p>;

  const scopeLabel = includeAll ? `of ${rows.length} invited` : `of ${attendingCount} attending`;

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/dashboard/events/${eventId}`} className="text-sm text-ink/60 hover:underline">← back to event</Link>
        <h1 className="font-display text-3xl mt-1">RSVP details</h1>
        <p className="text-ink/60 text-sm mt-1">
          What your guests told you when they responded — for the caterer, the DJ, and accommodation.
        </p>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={includeAll} onChange={(e) => setIncludeAll(e.target.checked)} />
        Include declined &amp; pending guests
      </label>

      <Section
        title="Accommodation help"
        count={accommodation.length}
        scopeLabel={scopeLabel}
        empty="No one has asked for help arranging accommodation."
        copyText={accommodation.map((r) => `${guestName(r)} — ${r.email ?? "no email"} — ${r.mobile_no ?? "no phone"}`).join("\n")}
      >
        {accommodation.map((r) => (
          <li key={r.id} className="flex items-start justify-between gap-4 py-2 border-t border-ink/5 first:border-t-0">
            <div>
              <div>{guestName(r)}</div>
              <div className="text-xs text-ink/60">
                {r.email ?? "no email"} · {r.mobile_no ?? "no phone"}
              </div>
            </div>
            <span className={`badge-${r.rsvp_status} shrink-0`}>{r.rsvp_status}</span>
          </li>
        ))}
      </Section>

      <Section
        title="Dietary requirements"
        count={dietary.length}
        scopeLabel={scopeLabel}
        empty="No dietary requirements have been submitted."
        copyText={dietary.map((r) => `${guestName(r)}: ${r.dietary_restrictions}`).join("\n")}
      >
        {dietary.map((r) => (
          <li key={r.id} className="flex items-start gap-4 py-2 border-t border-ink/5 first:border-t-0">
            <div className="w-56 shrink-0">
              <div>{guestName(r)}</div>
              <span className={`badge-${r.rsvp_status} mt-1`}>{r.rsvp_status}</span>
            </div>
            <p className="text-ink/80 whitespace-pre-wrap">{r.dietary_restrictions}</p>
          </li>
        ))}
      </Section>

      <Section
        title="Song requests"
        count={songs.length}
        scopeLabel={scopeLabel}
        empty="No song requests yet."
        copyText={songs.map((r) => `${r.song_requests} — ${guestName(r)}`).join("\n")}
      >
        {songs.map((r) => (
          <li key={r.id} className="flex items-baseline gap-3 py-2 border-t border-ink/5 first:border-t-0">
            <span className="text-ink/80 whitespace-pre-wrap">{r.song_requests}</span>
            <span className="text-xs text-ink/50">— {guestName(r)}</span>
          </li>
        ))}
      </Section>
    </div>
  );
}

function Section({
  title, count, scopeLabel, empty, copyText, children,
}: {
  title: string;
  count: number;
  scopeLabel: string;
  empty: string;
  copyText: string;
  children: React.ReactNode;
}) {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    await navigator.clipboard.writeText(copyText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <section className="card">
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-display text-xl">
          {title} <span className="text-ink/50 text-base">({count} {scopeLabel})</span>
        </h2>
        {count > 0 && (
          <button className="btn-ghost text-xs" onClick={onCopy}>{copied ? "Copied" : "Copy list"}</button>
        )}
      </div>
      {count === 0 ? (
        <p className="text-ink/50 text-sm py-2">{empty}</p>
      ) : (
        <ul className="text-sm">{children}</ul>
      )}
    </section>
  );
}
