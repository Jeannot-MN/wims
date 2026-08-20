"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { gql, GraphQLRequestError } from "@/web/client/graphql-client";

const Q = `
  query Q($id: ID!) {
    event(id: $id) {
      id title description starts_at ends_at rsvp_deadline_at is_rsvp_closed
      location { address_text formatted_address }
      dress_code gift_registry_url cover_image_url
      schedule { time title }
      custom_sections { heading }
    }
    eventDashboardStats(eventId: $id) { total accepted declined maybe pending }
  }
`;
const DEL = `mutation D($id: ID!) { deleteEvent(id: $id) }`;

type Data = {
  event: {
    id: string; title: string; description: string;
    starts_at: string; ends_at: string | null;
    rsvp_deadline_at: string; is_rsvp_closed: boolean;
    location: { address_text: string; formatted_address: string | null };
    dress_code: string; gift_registry_url: string; cover_image_url: string;
    schedule: { time: string; title: string }[];
    custom_sections: { heading: string }[];
  };
  eventDashboardStats: { total: number; accepted: number; declined: number; maybe: number; pending: number };
};

export function EventDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    gql<Data>(Q, { id }).then(setData).catch((e) => setError(e instanceof GraphQLRequestError ? e.message : "Load failed"));
  }, [id]);

  const onDelete = async () => {
    if (!confirm("Delete this event? Invitees will lose access to their invite URLs.")) return;
    try {
      await gql(DEL, { id });
      router.replace("/dashboard");
    } catch (e) {
      setError(e instanceof GraphQLRequestError ? e.message : "Delete failed");
    }
  };

  if (error) return <p className="text-rose text-sm">{error}</p>;
  if (!data) return <p className="text-ink/60 text-sm">Loading…</p>;

  const e = data.event;
  const s = data.eventDashboardStats;
  const starts = new Date(e.starts_at);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-4xl">{e.title}</h1>
          <p className="text-ink/60 mt-1">
            {starts.toLocaleString("en-GB", { dateStyle: "full", timeStyle: "short" })}
          </p>
        </div>
        <div className="flex gap-2">
          <Link className="btn-secondary" href={`/dashboard/events/${id}/edit`}>Edit</Link>
          <button className="btn-ghost text-rose" onClick={onDelete}>Delete</button>
        </div>
      </div>

      <section className="grid grid-cols-5 gap-3">
        <StatCard label="Invited" value={s.total} />
        <StatCard label="Accepted" value={s.accepted} accent="text-sage" />
        <StatCard label="Declined" value={s.declined} accent="text-rose" />
        <StatCard label="Maybe" value={s.maybe} />
        <StatCard label="Pending" value={s.pending} />
      </section>

      <section className="card flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl mb-1">Guest list & RSVPs</h2>
          <p className="text-ink/60 text-sm">Add invitees, upload Excel, copy invite links, see RSVPs.</p>
        </div>
        <Link className="btn-primary" href={`/dashboard/events/${id}/invitees`}>Manage invitees</Link>
      </section>

      <section className="card flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl mb-1">RSVP details</h2>
          <p className="text-ink/60 text-sm">
            Dietary requirements, song requests, and who needs help with accommodation.
          </p>
        </div>
        <Link className="btn-secondary" href={`/dashboard/events/${id}/rsvps`}>View details</Link>
      </section>

      <section className="card">
        <h2 className="font-display text-xl mb-3">Event details</h2>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <dt className="text-ink/50">RSVP deadline</dt>
          <dd>{new Date(e.rsvp_deadline_at).toLocaleString("en-GB")} {e.is_rsvp_closed ? "(closed)" : ""}</dd>
          <dt className="text-ink/50">Location</dt>
          <dd>{e.location.formatted_address ?? e.location.address_text ?? "—"}</dd>
          <dt className="text-ink/50">Dress code</dt>
          <dd>{e.dress_code || "—"}</dd>
          <dt className="text-ink/50">Gift registry</dt>
          <dd>{e.gift_registry_url || "—"}</dd>
          <dt className="text-ink/50">Schedule items</dt>
          <dd>{e.schedule.length}</dd>
          <dt className="text-ink/50">Custom sections</dt>
          <dd>{e.custom_sections.length}</dd>
        </dl>
      </section>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className="card text-center">
      <div className={`text-3xl font-display ${accent ?? ""}`}>{value}</div>
      <div className="text-xs uppercase tracking-wider text-ink/50 mt-1">{label}</div>
    </div>
  );
}
