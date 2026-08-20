"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { gql, GraphQLRequestError } from "@/web/client/graphql-client";
import { DEFAULT_COVER_IMAGE_URL } from "@/web/client/default-cover";

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

  useEffect(() => {
    gql<{ invite: Invite | null }>(Q, { token })
      .then((d) => setInvite(d.invite ?? "notfound"))
      .catch(() => setInvite("notfound"));
  }, [token]);

  if (invite === null) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-oat">
        <div className="flex flex-col items-center gap-3 text-ink/50">
          <Ornament className="w-10 h-10 animate-fade-in" />
          <p className="font-display italic text-xl tracking-wide">Loading your invitation…</p>
        </div>
      </main>
    );
  }
  if (invite === "notfound") {
    return (
      <main className="min-h-screen flex items-center justify-center bg-oat px-6">
        <div className="max-w-md text-center">
          <Ornament className="w-12 h-12 mx-auto mb-6 text-wine/60" />
          <h1 className="font-display text-4xl text-ink mb-3">Invitation not found</h1>
          <p className="text-ink/60">This invite link doesn&apos;t look right. Please check the link with your host.</p>
        </div>
      </main>
    );
  }

  return <Invitation token={token} invite={invite} />;
}

function Invitation({ token, invite }: { token: string; invite: Invite }) {
  const e = invite.event;
  const starts = new Date(e.starts_at);
  const greeting = invite.invitee.is_couple
    ? `${invite.invitee.primary_first_name} & ${invite.invitee.partner_first_name ?? "guest"}`
    : invite.invitee.primary_first_name;

  return (
    <main className="bg-oat text-ink">
      <TopNav title={e.title} />
      <Hero event={e} starts={starts} greeting={greeting} />

      <Section id="details" wide>
        <Reveal>
          <SectionHeading eyebrow="The day" title="Details" />
        </Reveal>
        <DetailsGrid event={e} starts={starts} />
        {e.description && (
          <Reveal>
            <blockquote className="mx-auto mt-14 max-w-2xl text-center font-display italic text-2xl md:text-3xl leading-relaxed text-ink/80">
              <span className="text-wine/60 text-4xl align-top mr-1 leading-none">“</span>
              <span className="whitespace-pre-wrap">{e.description}</span>
              <span className="text-wine/60 text-4xl align-top ml-1 leading-none">”</span>
            </blockquote>
          </Reveal>
        )}
      </Section>

      {e.schedule.length > 0 && (
        <Section id="schedule" muted>
          <Reveal>
            <SectionHeading eyebrow="Order of the day" title="Schedule" />
          </Reveal>
          <Schedule items={e.schedule} />
        </Section>
      )}

      <Section id="rsvp">
        <Reveal>
          <SectionHeading eyebrow="Kindly respond" title="RSVP" />
        </Reveal>
        <RsvpForm token={token} invite={invite} />
      </Section>

      {(e.gift_registry_url || e.custom_sections.length > 0) && (
        <Section id="more" muted wide>
          <div className="grid gap-8 md:grid-cols-3">
            {e.gift_registry_url && (
              <Reveal>
                <InfoCard title="Gift registry">
                  <a
                    className="inline-flex items-center gap-2 text-wine hover:text-wine/70 underline underline-offset-4"
                    href={e.gift_registry_url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Visit our registry
                    <span aria-hidden>↗</span>
                  </a>
                </InfoCard>
              </Reveal>
            )}
            {e.custom_sections.map((s, i) => (
              <Reveal key={i}>
                <InfoCard title={s.heading}>
                  <div className="whitespace-pre-wrap">{s.body}</div>
                </InfoCard>
              </Reveal>
            ))}
          </div>
        </Section>
      )}

      <Footer token={token} title={e.title} />
    </main>
  );
}

function TopNav({ title }: { title: string }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const links: { href: string; label: string }[] = [
    { href: "#top", label: "Home" },
    { href: "#details", label: "Details" },
    { href: "#schedule", label: "Schedule" },
    { href: "#rsvp", label: "RSVP" },
  ];

  return (
    <nav
      className={`fixed inset-x-0 top-0 z-40 transition-all duration-500 ${
        scrolled ? "bg-oat/85 backdrop-blur border-b border-ink/5" : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <a href="#top" className={`font-display tracking-wide transition-colors ${scrolled ? "text-ink" : "text-white"}`}>
          <span className="text-lg">{title}</span>
        </a>
        <ul className="hidden md:flex gap-7 text-sm tracking-widest uppercase">
          {links.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                className={`transition-colors ${
                  scrolled ? "text-ink/70 hover:text-wine" : "text-white/85 hover:text-white"
                }`}
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}

function Hero({
  event,
  starts,
  greeting,
}: {
  event: Invite["event"];
  starts: Date;
  greeting: string;
}) {
  const cover = event.cover_image_url || DEFAULT_COVER_IMAGE_URL;
  return (
    <header id="top" className="relative isolate min-h-screen overflow-hidden">
      {/* The gradient sits under the photo so a failed image load still reads. */}
      <div className="absolute inset-0 -z-20 bg-gradient-to-br from-wine via-orchid to-blush" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={cover} alt="" className="absolute inset-0 -z-10 h-full w-full object-cover" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-wine/55 via-wine/35 to-ink/70" />

      <div className="relative mx-auto flex min-h-screen max-w-4xl flex-col items-center justify-center px-6 py-32 text-center text-white">
        <p className="animate-fade-in mb-6 text-xs uppercase tracking-[0.4em] text-white/80">
          Dear {greeting}, you are invited
        </p>
        <Ornament className="w-12 h-12 text-white/85 mb-6 animate-fade-in" />
        <h1 className="animate-fade-up font-display text-6xl md:text-8xl leading-none drop-shadow-sm">
          {event.title}
        </h1>
        <div className="animate-fade-up mt-8 flex items-center gap-4 text-white/90">
          <span className="h-px w-12 bg-white/50" />
          <span className="font-display text-lg md:text-xl italic tracking-wide">
            {starts.toLocaleDateString("en-GB", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </span>
          <span className="h-px w-12 bg-white/50" />
        </div>
        {(event.location.formatted_address || event.location.address_text) && (
          <p className="animate-fade-up mt-2 text-white/80 text-sm tracking-wider">
            {event.location.formatted_address ?? event.location.address_text}
          </p>
        )}

        <div className="animate-fade-up mt-12">
          <Countdown target={starts} />
        </div>

        <a
          href="#details"
          className="animate-fade-in absolute bottom-10 inline-flex flex-col items-center gap-2 text-xs uppercase tracking-[0.3em] text-white/70 hover:text-white"
        >
          Scroll
          <span className="h-8 w-px bg-white/50 animate-pulse" />
        </a>
      </div>
    </header>
  );
}

function Countdown({ target }: { target: Date }) {
  const [now, setNow] = useState<number>(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const diff = Math.max(0, target.getTime() - now);
  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  const seconds = Math.floor((diff % 60_000) / 1000);

  if (diff === 0) {
    return <p className="font-display italic text-2xl">I have found the one whom my soul loves.</p>;
  }

  const cells: [number, string][] = [
    [days, "Days"],
    [hours, "Hours"],
    [minutes, "Minutes"],
    [seconds, "Seconds"],
  ];

  return (
    <div className="flex gap-4 md:gap-8">
      {cells.map(([n, label]) => (
        <div key={label} className="flex flex-col items-center min-w-[64px]">
          <span className="font-display text-4xl md:text-5xl tabular-nums">
            {String(n).padStart(2, "0")}
          </span>
          <span className="mt-1 text-[10px] uppercase tracking-[0.3em] text-white/70">
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}

function Section({
  id,
  muted,
  wide,
  children,
}: {
  id?: string;
  muted?: boolean;
  /** Roomier column, for sections whose content is a full-width card grid. */
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className={`relative ${muted ? "bg-cream" : "bg-oat"} py-24 md:py-32`}>
      <div className={`mx-auto ${wide ? "max-w-6xl" : "max-w-5xl"} px-6`}>{children}</div>
    </section>
  );
}

function SectionHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="mb-16 flex flex-col items-center text-center">
      <span className="text-xs uppercase tracking-[0.4em] text-wine/70">{eyebrow}</span>
      <h2 className="font-display text-5xl md:text-6xl mt-3 text-ink">{title}</h2>
      <Ornament className="w-10 h-10 text-wine/50 mt-5" />
    </div>
  );
}

function DetailsGrid({ event, starts }: { event: Invite["event"]; starts: Date }) {
  const ends = event.ends_at ? new Date(event.ends_at) : null;
  const time = starts.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  const endTime = ends
    ? ends.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
    : null;
  const address = event.location.formatted_address ?? event.location.address_text;

  return (
    <div className="grid gap-8 md:grid-cols-3">
      <Reveal>
        <DetailCard label="When">
          <p className="font-display text-3xl">
            {starts.toLocaleDateString("en-GB", { day: "numeric", month: "long" })}
          </p>
          <p className="mt-2 text-lg text-ink/70">
            {time}
            {endTime ? ` – ${endTime}` : ""}
          </p>
        </DetailCard>
      </Reveal>
      <Reveal>
        <DetailCard label="Where">
          {address ? (
            <a
              href={event.location.maps_url}
              target="_blank"
              rel="noreferrer"
              className="block hover:text-wine transition-colors"
            >
              <p className="font-display text-3xl leading-tight">{address}</p>
              <p className="mt-2 text-xs uppercase tracking-widest text-wine/70">View on map ↗</p>
            </a>
          ) : (
            <p className="text-ink/60 italic">To be announced</p>
          )}
        </DetailCard>
      </Reveal>
      <Reveal>
        <DetailCard label="Dress code">
          {event.dress_code ? (
            <p className="font-display text-3xl">{event.dress_code}</p>
          ) : (
            <p className="text-ink/60 italic">Come as you wish</p>
          )}
        </DetailCard>
      </Reveal>
    </div>
  );
}

function DetailCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="group relative flex h-full min-h-[16rem] flex-col overflow-hidden rounded-sm border border-ink/10 bg-white/60 backdrop-blur px-9 py-12 text-center transition-all hover:border-wine/30 hover:bg-white">
      <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-wine/40 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
      {/* Label pinned to the top so all three line up; the value centres in what's left. */}
      <p className="text-[11px] uppercase tracking-[0.4em] text-wine/70">{label}</p>
      <div className="flex flex-1 flex-col justify-center">{children}</div>
    </div>
  );
}

function Schedule({ items }: { items: Invite["event"]["schedule"] }) {
  return (
    <ol className="relative mx-auto max-w-2xl">
      <span aria-hidden className="absolute left-[7.25rem] top-2 bottom-2 w-px bg-wine/20" />
      {items.map((it, i) => (
        <Reveal key={i}>
          <li className="relative flex gap-8 py-5">
            <div className="w-24 shrink-0 text-right font-display text-xl text-wine">
              {it.time}
            </div>
            <span
              aria-hidden
              className="absolute left-[7rem] top-7 h-2.5 w-2.5 rounded-full bg-wine ring-4 ring-oat"
            />
            <div className="pl-8">
              <h3 className="font-display text-2xl text-ink">{it.title}</h3>
              {it.description && (
                <p className="mt-1 text-ink/70 leading-relaxed">{it.description}</p>
              )}
            </div>
          </li>
        </Reveal>
      ))}
    </ol>
  );
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex h-full min-h-[16rem] flex-col rounded-sm border border-ink/10 bg-white/70 px-8 py-12 text-center">
      {/* Same shape as DetailCard: heading pinned to the top so every card lines
          up, and the body centres in whatever space is left. */}
      <h3 className="font-display text-2xl">{title}</h3>
      <div className="flex flex-1 flex-col justify-center text-ink/80">{children}</div>
    </div>
  );
}

function Footer({ token, title }: { token: string; title: string }) {
  return (
    <footer className="bg-ink text-white">
      <div className="mx-auto max-w-4xl px-6 py-20 text-center">
        <Ornament className="w-12 h-12 mx-auto text-white/60" />
        <p className="mt-6 font-display text-4xl md:text-5xl leading-tight">{title}</p>
        <p className="mt-4 italic text-white/70 font-display text-xl">
          With love, we can&apos;t wait to celebrate with you.
        </p>
        <a
          href={`/invite/${token}/pdf`}
          target="_blank"
          rel="noreferrer"
          className="mt-10 inline-flex items-center gap-2 border border-white/40 px-6 py-3 text-xs uppercase tracking-[0.3em] transition-colors hover:bg-white hover:text-ink"
        >
          Download invitation
          <span aria-hidden>↓</span>
        </a>
      </div>
    </footer>
  );
}

function Reveal({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setShown(true);
          obs.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${
        shown ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
      }`}
    >
      {children}
    </div>
  );
}

function Ornament({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M32 8v48" />
      <path d="M32 16c-6 2-9 6-9 11s4 8 9 8 9-3 9-8-3-9-9-11z" />
      <path d="M22 38c-4 2-6 5-6 9 4 0 7-2 9-5" />
      <path d="M42 38c4 2 6 5 6 9-4 0-7-2-9-5" />
      <circle cx="32" cy="56" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

function RsvpForm({ token, invite }: { token: string; invite: Invite }) {
  const [status, setStatus] = useState<string>(
    invite.rsvp.status === "pending" ? "" : invite.rsvp.status,
  );
  const [dietary, setDietary] = useState(invite.rsvp.dietary_restrictions);
  const [songs, setSongs] = useState(invite.rsvp.song_requests);
  const [accommodation, setAccommodation] = useState(invite.rsvp.accommodation_needed);
  const [partnerFirst, setPartnerFirst] = useState(invite.invitee.partner_first_name ?? "");
  const [partnerLast, setPartnerLast] = useState(invite.invitee.partner_last_name ?? "");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deadlineLabel = useMemo(
    () =>
      new Date(invite.deadline).toLocaleDateString("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    [invite.deadline],
  );

  if (invite.is_rsvp_closed) {
    return (
      <Reveal>
        <div className="mx-auto max-w-xl rounded-sm border border-ink/10 bg-white/60 px-8 py-12 text-center">
          <Ornament className="w-10 h-10 mx-auto text-wine/40 mb-4" />
          <h3 className="font-display text-3xl mb-2">RSVPs are closed</h3>
          <p className="text-ink/60">
            The deadline was {deadlineLabel}. Please reach out to the hosts directly.
          </p>
        </div>
      </Reveal>
    );
  }

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!status) {
      setError("Please choose Accept, Maybe, or Decline.");
      return;
    }
    setBusy(true);
    setError(null);
    setSaved(false);
    // The extras are only shown when accepting, so don't submit what the guest
    // couldn't see — otherwise a decline can carry stale notes into the host's lists.
    const attending = status === "accepted";
    try {
      await gql(SUBMIT, {
        token,
        input: {
          status,
          dietary_restrictions: attending ? dietary : "",
          song_requests: attending ? songs : "",
          accommodation_needed: attending ? accommodation : false,
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

  const options: { value: string; label: string; sub: string }[] = [
    { value: "accepted", label: "Joyfully accept", sub: "Count me in" },
    { value: "maybe", label: "Tentative", sub: "Not yet sure" },
    { value: "declined", label: "Regretfully decline", sub: "Cannot make it" },
  ];

  return (
    <Reveal>
      <form
        onSubmit={submit}
        className="mx-auto max-w-2xl rounded-sm border border-ink/10 bg-white/70 px-6 py-10 md:px-12 md:py-14 backdrop-blur"
      >
        <p className="text-center text-sm text-ink/70 mb-2">
          Please respond by{" "}
          <span className="font-medium text-wine">{deadlineLabel}</span>.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6">
          {options.map((opt) => {
            const active = status === opt.value;
            return (
              <button
                type="button"
                key={opt.value}
                onClick={() => setStatus(opt.value)}
                className={`group rounded-sm border px-4 py-5 text-center transition-all ${
                  active
                    ? "border-wine bg-wine text-white shadow-lg shadow-wine/20"
                    : "border-ink/15 bg-white hover:border-wine/60 hover:bg-blush/30 text-ink"
                }`}
              >
                <div className="font-display text-lg leading-tight">{opt.label}</div>
                <div
                  className={`mt-1 text-[10px] uppercase tracking-[0.25em] ${
                    active ? "text-white/70" : "text-ink/50 group-hover:text-wine/70"
                  }`}
                >
                  {opt.sub}
                </div>
              </button>
            );
          })}
        </div>

        {invite.invitee.is_couple && (
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Partner first name">
              <input
                className="invite-input"
                value={partnerFirst}
                onChange={(e) => setPartnerFirst(e.target.value)}
              />
            </Field>
            <Field label="Partner last name">
              <input
                className="invite-input"
                value={partnerLast}
                onChange={(e) => setPartnerLast(e.target.value)}
              />
            </Field>
          </div>
        )}

        <div
          className={`grid transition-all duration-500 ${
            status === "accepted" ? "grid-rows-[1fr] opacity-100 mt-8" : "grid-rows-[0fr] opacity-0"
          }`}
        >
          <div className="overflow-hidden">
            <div className="space-y-5">
              <Field label="Dietary restrictions">
                <input
                  className="invite-input"
                  value={dietary}
                  onChange={(e) => setDietary(e.target.value)}
                  placeholder="e.g. vegetarian, gluten-free"
                />
              </Field>
              <Field label="Song requests">
                <input
                  className="invite-input"
                  value={songs}
                  onChange={(e) => setSongs(e.target.value)}
                  placeholder="What gets you on the dance floor?"
                />
              </Field>
              <label className="flex items-center gap-3 text-sm text-ink/80">
                <input
                  type="checkbox"
                  checked={accommodation}
                  onChange={(e) => setAccommodation(e.target.checked)}
                  className="h-4 w-4 accent-wine"
                />
                I&apos;d like help arranging accommodation
              </label>
            </div>
          </div>
        </div>

        {error && (
          <p className="mt-6 text-center text-sm text-wine bg-wine/10 border border-wine/30 rounded-sm py-2 px-4">
            {error}
          </p>
        )}
        {saved && (
          <p className="mt-6 text-center text-sm text-sage bg-sage/10 border border-sage/30 rounded-sm py-2 px-4">
            Thank you — your response has been recorded. You can update it any time before the deadline.
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="mt-8 w-full rounded-sm bg-ink py-4 text-xs uppercase tracking-[0.35em] text-white transition-colors hover:bg-wine disabled:opacity-60"
        >
          {busy ? "Sending…" : invite.rsvp.status === "pending" ? "Send my response" : "Update my response"}
        </button>
      </form>
    </Reveal>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10px] uppercase tracking-[0.3em] text-ink/60">
        {label}
      </span>
      {children}
    </label>
  );
}
