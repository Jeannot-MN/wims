"use client";

import { useEffect, useState } from "react";
import { gql, GraphQLRequestError } from "@/web/client/graphql-client";

const Q = `
  query I($token: String!) {
    invite(token: $token) {
      event {
        title description starts_at ends_at rsvp_deadline_at
        location { address_text formatted_address maps_url }
        dress_code gift_registry_url cover_image_url
        schedule { time title description }
        custom_sections { heading body }
      }
      invitee { primary_first_name primary_last_name partner_first_name partner_last_name is_couple }
      rsvp { status dietary_restrictions song_requests accommodation_needed }
      is_rsvp_closed
      deadline
    }
  }
`;

const SUBMIT = `
  mutation Sub($token: String!, $input: SubmitRsvpInput!) {
    submitRsvp(token: $token, input: $input) {
      rsvp { status dietary_restrictions song_requests accommodation_needed }
      invitee { partner_first_name partner_last_name }
    }
  }
`;

type Invite = {
  event: {
    title: string; description: string;
    starts_at: string; ends_at: string | null;
    rsvp_deadline_at: string;
    location: { address_text: string; formatted_address: string | null; maps_url: string };
    dress_code: string; gift_registry_url: string; cover_image_url: string;
    schedule: { time: string; title: string; description: string }[];
    custom_sections: { heading: string; body: string }[];
  };
  invitee: { primary_first_name: string; primary_last_name: string; partner_first_name: string | null; partner_last_name: string | null; is_couple: boolean };
  rsvp: { status: string; dietary_restrictions: string; song_requests: string; accommodation_needed: boolean };
  is_rsvp_closed: boolean;
  deadline: string;
};

export function InvitePageClient({ token }: { token: string }) {
  const [invite, setInvite] = useState<Invite | null | "notfound">(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    gql<{ invite: Invite | null }>(Q, { token })
      .then((d) => setInvite(d.invite ?? "notfound"))
      .catch(() => setInvite("notfound"));
  }, [token]);

  if (invite === null) {
    return <p className="text-center py-20 text-ink/60">Loading…</p>;
  }
  if (invite === "notfound") {
    return (
      <div className="max-w-md mx-auto py-20 text-center">
        <h1 className="font-display text-3xl mb-3">Invitation not found</h1>
        <p className="text-ink/60">This invite URL doesn&apos;t look right. Check the link with the host.</p>
      </div>
    );
  }

  const e = invite.event;
  const starts = new Date(e.starts_at);
  const greeting = invite.invitee.is_couple
    ? `${invite.invitee.primary_first_name} & ${invite.invitee.partner_first_name}`
    : invite.invitee.primary_first_name;

  return (
    <article className="max-w-2xl mx-auto pb-20">
      {e.cover_image_url && (
        <div className="aspect-[16/9] mb-8 overflow-hidden rounded-lg">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={e.cover_image_url} alt="" className="w-full h-full object-cover" />
        </div>
      )}
      <header className="text-center mb-12">
        <p className="uppercase tracking-widest text-sage text-xs mb-2">Dear {greeting}, you&apos;re invited to</p>
        <h1 className="font-display text-5xl text-ink mb-3">{e.title}</h1>
        <p className="text-ink/70">
          {starts.toLocaleString("en-GB", { dateStyle: "full", timeStyle: "short" })}
        </p>
        {e.location.formatted_address || e.location.address_text ? (
          <p className="text-ink/60 mt-2">
            <a className="underline" href={e.location.maps_url} target="_blank" rel="noreferrer">
              {e.location.formatted_address ?? e.location.address_text}
            </a>
          </p>
        ) : null}
      </header>

      {e.description && (
        <section className="card mb-6">
          <div className="prose-sm whitespace-pre-wrap">{e.description}</div>
        </section>
      )}

      <RsvpForm token={token} invite={invite} />

      {e.dress_code && (
        <SectionCard title="Dress code">{e.dress_code}</SectionCard>
      )}
      {e.schedule.length > 0 && (
        <SectionCard title="Schedule">
          <ul className="space-y-2">
            {e.schedule.map((it, i) => (
              <li key={i} className="flex gap-3">
                <span className="font-display text-rose w-16">{it.time}</span>
                <div>
                  <div className="font-medium">{it.title}</div>
                  {it.description && <div className="text-ink/60 text-sm">{it.description}</div>}
                </div>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}
      {e.gift_registry_url && (
        <SectionCard title="Gift registry">
          <a className="underline" href={e.gift_registry_url} target="_blank" rel="noreferrer">
            {e.gift_registry_url}
          </a>
        </SectionCard>
      )}
      {e.custom_sections.map((s, i) => (
        <SectionCard key={i} title={s.heading}>
          <div className="whitespace-pre-wrap">{s.body}</div>
        </SectionCard>
      ))}

      <div className="text-center mt-10">
        <a className="btn-secondary" href={`/invite/${token}/pdf`} target="_blank" rel="noreferrer">
          Download PDF invitation
        </a>
      </div>

      {error && <p className="text-rose text-sm mt-4 text-center">{error}</p>}
    </article>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card mb-4">
      <h2 className="font-display text-2xl mb-2">{title}</h2>
      <div className="text-ink/80 text-sm">{children}</div>
    </section>
  );
}

function RsvpForm({ token, invite }: { token: string; invite: Invite }) {
  const [status, setStatus] = useState<string>(invite.rsvp.status === "pending" ? "" : invite.rsvp.status);
  const [dietary, setDietary] = useState(invite.rsvp.dietary_restrictions);
  const [songs, setSongs] = useState(invite.rsvp.song_requests);
  const [accommodation, setAccommodation] = useState(invite.rsvp.accommodation_needed);
  const [partnerFirst, setPartnerFirst] = useState(invite.invitee.partner_first_name ?? "");
  const [partnerLast, setPartnerLast] = useState(invite.invitee.partner_last_name ?? "");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (invite.is_rsvp_closed) {
    return (
      <section className="card mb-6 text-center">
        <h2 className="font-display text-2xl mb-2">RSVPs are closed</h2>
        <p className="text-ink/60 text-sm">
          The RSVP deadline was {new Date(invite.deadline).toLocaleDateString("en-GB", { dateStyle: "full" })}.
        </p>
      </section>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!status) {
      setError("Please choose Accept, Decline, or Maybe");
      return;
    }
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      await gql(SUBMIT, {
        token,
        input: {
          status,
          dietary_restrictions: dietary,
          song_requests: songs,
          accommodation_needed: accommodation,
          partner_first_name: invite.invitee.is_couple ? partnerFirst : null,
          partner_last_name: invite.invitee.is_couple ? partnerLast : null,
        },
      });
      setSaved(true);
    } catch (err) {
      setError(err instanceof GraphQLRequestError ? err.message : "Submit failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="card mb-6 space-y-4">
      <h2 className="font-display text-2xl">Your RSVP</h2>
      <div className="flex gap-2">
        {(["accepted", "maybe", "declined"] as const).map((opt) => (
          <button
            type="button"
            key={opt}
            className={`btn ${status === opt ? "bg-rose text-white" : "bg-ink/5 text-ink"} flex-1`}
            onClick={() => setStatus(opt)}
          >
            {opt === "accepted" ? "Joyfully accept" : opt === "declined" ? "Regretfully decline" : "Maybe"}
          </button>
        ))}
      </div>

      {invite.invitee.is_couple && (
        <div className="grid grid-cols-2 gap-2">
          <input className="input" placeholder="Partner first name" value={partnerFirst} onChange={(e) => setPartnerFirst(e.target.value)} />
          <input className="input" placeholder="Partner last name" value={partnerLast} onChange={(e) => setPartnerLast(e.target.value)} />
        </div>
      )}

      {status === "accepted" && (
        <>
          <div>
            <label className="label">Dietary restrictions</label>
            <input className="input" value={dietary} onChange={(e) => setDietary(e.target.value)} placeholder="e.g. vegetarian, gluten-free" />
          </div>
          <div>
            <label className="label">Song requests</label>
            <input className="input" value={songs} onChange={(e) => setSongs(e.target.value)} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={accommodation} onChange={(e) => setAccommodation(e.target.checked)} />
            I need accommodation
          </label>
        </>
      )}

      {error && <p className="text-rose text-sm">{error}</p>}
      {saved && <p className="text-sage text-sm">Your RSVP has been recorded. You can change it any time before the deadline.</p>}

      <button type="submit" className="btn-primary w-full" disabled={busy}>
        {busy ? "Saving…" : invite.rsvp.status === "pending" ? "Submit RSVP" : "Update RSVP"}
      </button>
    </form>
  );
}
