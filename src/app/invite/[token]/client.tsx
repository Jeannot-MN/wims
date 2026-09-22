"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { gql, GraphQLRequestError } from "@/web/client/graphql-client";
import { DEFAULT_COVER_IMAGE_URL } from "@/web/client/default-cover";
import { DeveloperCredit } from "@/web/client/app-footer";
import { BANK_DETAILS, GIFTS_PARAGRAPHS, GUEST_NOTES } from "@/domain/invite/wedding-content";
import { InviteI18nProvider, useInviteI18n, type Locale } from "@/web/client/invite-i18n";

const Q = `
  query I($token: String!) {
    invite(token: $token) {
      event {
        title title_fr description description_fr starts_at ends_at rsvp_deadline_at
        location { address_text formatted_address maps_url }
        dress_code dress_code_fr gift_registry_url cover_image_url
        schedule { time title title_fr description description_fr }
        custom_sections { heading heading_fr body body_fr }
      }
      invitee { primary_first_name primary_last_name partner_first_name partner_last_name email is_couple }
      rsvp { status }
      is_rsvp_closed
      deadline
    }
  }
`;

const SUBMIT = `
  mutation Sub($token: String!, $input: SubmitRsvpInput!) {
    submitRsvp(token: $token, input: $input) {
      rsvp { status }
      invitee { partner_first_name partner_last_name email }
    }
  }
`;

type Invite = {
  event: {
    title: string; title_fr: string;
    description: string; description_fr: string;
    starts_at: string; ends_at: string | null;
    rsvp_deadline_at: string;
    location: { address_text: string; formatted_address: string | null; maps_url: string };
    dress_code: string; dress_code_fr: string;
    gift_registry_url: string; cover_image_url: string;
    schedule: { time: string; title: string; title_fr: string; description: string; description_fr: string }[];
    custom_sections: { heading: string; heading_fr: string; body: string; body_fr: string }[];
  };
  invitee: {
    primary_first_name: string; primary_last_name: string;
    partner_first_name: string | null; partner_last_name: string | null;
    email: string | null; is_couple: boolean;
  };
  rsvp: { status: string };
  is_rsvp_closed: boolean;
  deadline: string;
};

const DRESS_CODE_IMAGES: string[] = [
  "/dress-code-1.jpeg",
  "/dress-code-2.jpeg",
  "/dress-code-3.jpeg",
  "/dress-code-4.jpeg",
  "/dress-code-5.jpeg",
  "/dress-code-6.jpeg",
  "/dress-code-7.jpeg",
];

export function InvitePageClient({ token }: { token: string }) {
  return (
    <InviteI18nProvider>
      <InvitePage token={token} />
    </InviteI18nProvider>
  );
}

function InvitePage({ token }: { token: string }) {
  const { t } = useInviteI18n();
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
          <p className="font-display italic text-xl tracking-wide">{t("loading")}</p>
        </div>
      </main>
    );
  }
  if (invite === "notfound") {
    return (
      <main className="min-h-screen flex items-center justify-center bg-oat px-6">
        <div className="max-w-md text-center">
          <Ornament className="w-12 h-12 mx-auto mb-6 text-wine/60" />
          <h1 className="font-display text-4xl text-ink mb-3">{t("notFoundTitle")}</h1>
          <p className="text-ink/60">{t("notFoundBody")}</p>
        </div>
      </main>
    );
  }

  return <Invitation token={token} invite={invite} />;
}

function Invitation({ token, invite }: { token: string; invite: Invite }) {
  const { t, locale, pick } = useInviteI18n();
  const e = invite.event;
  const starts = new Date(e.starts_at);
  const greeting = invite.invitee.is_couple
    ? `${invite.invitee.primary_first_name} & ${invite.invitee.partner_first_name ?? t("heroGuestFallback")}`
    : invite.invitee.primary_first_name;

  const title = pick(e.title, e.title_fr);
  const description = pick(e.description, e.description_fr);

  return (
    <main className="bg-oat text-ink">
      <TopNav title={title} />
      <Hero event={e} title={title} starts={starts} greeting={greeting} />

      <Section id="details" wide>
        <Reveal>
          <SectionHeading eyebrow={t("detailsEyebrow")} title={t("detailsTitle")} />
        </Reveal>
        <DetailsGrid event={e} starts={starts} />
        {description && (
          <Reveal>
            <blockquote className="mx-auto mt-14 max-w-2xl text-center font-display italic text-2xl md:text-3xl leading-relaxed text-ink/80">
              <span className="text-wine/60 text-4xl align-top mr-1 leading-none">“</span>
              <span className="whitespace-pre-wrap">{description}</span>
              <span className="text-wine/60 text-4xl align-top ml-1 leading-none">”</span>
            </blockquote>
          </Reveal>
        )}
      </Section>

      <Section id="gifts" muted>
        <Reveal>
          <SectionHeading eyebrow={t("giftsEyebrow")} title={t("giftsTitle")} />
        </Reveal>
        <Reveal>
          <div className="mx-auto max-w-2xl rounded-sm border border-ink/10 bg-white/70 px-8 py-12 text-center md:px-14">
            {GIFTS_PARAGRAPHS[locale].map((paragraph, i) => (
              <p key={i} className={`text-lg leading-relaxed text-ink/80 ${i > 0 ? "mt-4" : ""}`}>
                {paragraph}
              </p>
            ))}
            <dl className="mx-auto mt-10 max-w-sm text-left">
              {BANK_DETAILS.map((row) => (
                <div key={row.label} className="border-t border-ink/10 py-4 first:border-t-0">
                  <dt className="text-[11px] uppercase tracking-[0.4em] text-wine/70">
                    {locale === "fr" ? row.label_fr : row.label}
                  </dt>
                  <dd className="mt-1.5 font-display text-2xl tabular-nums text-ink">{row.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </Reveal>
      </Section>

      <Section id="dress-code">
        <Reveal>
          <SectionHeading eyebrow={t("dressCodeEyebrow")} title={t("dressCodeTitle")} />
        </Reveal>
        <Reveal>
          <p className="-mt-10 mb-12 text-center font-display text-4xl md:text-5xl text-wine">
            Royal Ascot Bloom
          </p>
        </Reveal>
        <Reveal>
          <DressCodeSlideshow />
        </Reveal>
        <Reveal>
          <div className="mx-auto mt-14 max-w-2xl space-y-3 text-center text-ink/70">
            {GUEST_NOTES[locale].map((note, i) => (
              <p key={i}>{note}</p>
            ))}
          </div>
        </Reveal>
      </Section>

      {e.schedule.length > 0 && (
        <Section id="schedule" muted>
          <Reveal>
            <SectionHeading eyebrow={t("scheduleEyebrow")} title={t("scheduleTitle")} />
          </Reveal>
          <Schedule items={e.schedule} />
        </Section>
      )}

      <Section id="rsvp">
        <Reveal>
          <SectionHeading eyebrow={t("rsvpEyebrow")} title={t("rsvpTitle")} />
        </Reveal>
        <RsvpForm token={token} invite={invite} />
      </Section>

      {(e.gift_registry_url || e.custom_sections.length > 0) && (
        <Section id="more" muted wide>
          <div className="grid gap-8 md:grid-cols-3">
            {e.gift_registry_url && (
              <Reveal>
                <InfoCard title={t("giftRegistryTitle")}>
                  <a
                    className="inline-flex items-center gap-2 text-wine hover:text-wine/70 underline underline-offset-4"
                    href={e.gift_registry_url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {t("visitRegistry")}
                    <span aria-hidden>↗</span>
                  </a>
                </InfoCard>
              </Reveal>
            )}
            {e.custom_sections.map((s, i) => (
              <Reveal key={i}>
                <InfoCard title={pick(s.heading, s.heading_fr)}>
                  <div className="whitespace-pre-wrap">{pick(s.body, s.body_fr)}</div>
                </InfoCard>
              </Reveal>
            ))}
          </div>
        </Section>
      )}

      <Footer token={token} title={title} />
    </main>
  );
}

function TopNav({ title }: { title: string }) {
  const { t } = useInviteI18n();
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const links: { href: string; label: string }[] = [
    { href: "#top", label: t("navHome") },
    { href: "#details", label: t("navDetails") },
    { href: "#schedule", label: t("navSchedule") },
    { href: "#rsvp", label: t("navRsvp") },
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
        <div className="flex items-center gap-6">
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
          <LanguageSwitch scrolled={scrolled} />
        </div>
      </div>
    </nav>
  );
}

function LanguageSwitch({ scrolled }: { scrolled: boolean }) {
  const { locale, setLocale } = useInviteI18n();
  const options: { value: Locale; label: string }[] = [
    { value: "en", label: "EN" },
    { value: "fr", label: "FR" },
  ];

  return (
    <div
      className={`flex items-center rounded-full border p-0.5 text-[11px] tracking-[0.2em] transition-colors ${
        scrolled ? "border-ink/15 bg-white/60" : "border-white/40 bg-white/10 backdrop-blur"
      }`}
    >
      {options.map((opt) => {
        const active = locale === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => setLocale(opt.value)}
            aria-pressed={active}
            lang={opt.value}
            className={`rounded-full px-3 py-1 transition-colors ${
              active
                ? "bg-wine text-white"
                : scrolled
                  ? "text-ink/60 hover:text-wine"
                  : "text-white/80 hover:text-white"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function Hero({
  event,
  title,
  starts,
  greeting,
}: {
  event: Invite["event"];
  title: string;
  starts: Date;
  greeting: string;
}) {
  const { t, longDate } = useInviteI18n();
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
          {t("heroInvited", { name: greeting })}
        </p>
        <Ornament className="w-12 h-12 text-white/85 mb-6 animate-fade-in" />
        <h1 className="animate-fade-up font-display text-6xl md:text-8xl leading-none drop-shadow-sm">
          {title}
        </h1>
        <div className="animate-fade-up mt-8 flex items-center gap-4 text-white/90">
          <span className="h-px w-12 bg-white/50" />
          <span className="font-display text-lg md:text-xl italic tracking-wide">
            {longDate(starts)}
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
          {t("scroll")}
          <span className="h-8 w-px bg-white/50 animate-pulse" />
        </a>
      </div>
    </header>
  );
}

function Countdown({ target }: { target: Date }) {
  const { t } = useInviteI18n();
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
    return <p className="font-display italic text-2xl">{t("countdownArrived")}</p>;
  }

  const cells: [number, string][] = [
    [days, t("countdownDays")],
    [hours, t("countdownHours")],
    [minutes, t("countdownMinutes")],
    [seconds, t("countdownSeconds")],
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
  const { t, pick, dateLocale } = useInviteI18n();
  const ends = event.ends_at ? new Date(event.ends_at) : null;
  const time = starts.toLocaleTimeString(dateLocale, { hour: "2-digit", minute: "2-digit" });
  const endTime = ends
    ? ends.toLocaleTimeString(dateLocale, { hour: "2-digit", minute: "2-digit" })
    : null;
  const address = event.location.formatted_address ?? event.location.address_text;
  const dressCode = pick(event.dress_code, event.dress_code_fr);

  return (
    <div className="grid gap-8 md:grid-cols-3">
      <Reveal>
        <DetailCard label={t("when")}>
          <p className="font-display text-3xl">
            {starts.toLocaleDateString(dateLocale, { day: "numeric", month: "long" })}
          </p>
          <p className="mt-2 text-lg text-ink/70">
            {time}
            {endTime ? ` – ${endTime}` : ""}
          </p>
        </DetailCard>
      </Reveal>
      <Reveal>
        <DetailCard label={t("where")}>
          {address ? (
            <a
              href={event.location.maps_url}
              target="_blank"
              rel="noreferrer"
              className="block hover:text-wine transition-colors"
            >
              <p className="font-display text-3xl leading-tight">{address}</p>
              <p className="mt-2 text-xs uppercase tracking-widest text-wine/70">{t("viewOnMap")}</p>
            </a>
          ) : (
            <p className="text-ink/60 italic">{t("toBeAnnounced")}</p>
          )}
        </DetailCard>
      </Reveal>
      <Reveal>
        <DetailCard label={t("dressCodeLabel")}>
          {dressCode ? (
            <p className="font-display text-3xl">{dressCode}</p>
          ) : (
            <p className="text-ink/60 italic">{t("comeAsYouWish")}</p>
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
  const { pick } = useInviteI18n();
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
              <h3 className="font-display text-2xl text-ink">{pick(it.title, it.title_fr)}</h3>
              {pick(it.description, it.description_fr) && (
                <p className="mt-1 text-ink/70 leading-relaxed">
                  {pick(it.description, it.description_fr)}
                </p>
              )}
            </div>
          </li>
        </Reveal>
      ))}
    </ol>
  );
}

function DressCodeSlideshow() {
  const { t } = useInviteI18n();
  const count = DRESS_CODE_IMAGES.length;
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % count), 5000);
    return () => clearInterval(id);
  }, [paused, count]);

  // Stepping wraps both ways, so the arrows never dead-end on the first or last slide.
  const step = (delta: number) => setIndex((i) => (i + delta + count) % count);

  return (
    <div
      className="mx-auto max-w-lg"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="relative aspect-[4/5] overflow-hidden rounded-sm border border-ink/10 bg-cream">
        {DRESS_CODE_IMAGES.map((src, i) => (
          <div
            key={src}
            aria-hidden={i !== index}
            className={`absolute inset-0 transition-opacity duration-700 ${
              i === index ? "opacity-100" : "opacity-0"
            }`}
          >
            {/* The photos are a mix of portrait, square and landscape. A blurred copy
                fills the frame so the real image can sit uncropped on top of it. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt=""
              aria-hidden
              className="absolute inset-0 h-full w-full scale-110 object-cover opacity-40 blur-2xl"
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={t("outfitAlt", { n: i + 1, total: count })}
              className="relative h-full w-full object-contain"
            />
          </div>
        ))}

        <SlideArrow label={t("previousOutfit")} onClick={() => step(-1)} side="left" />
        <SlideArrow label={t("nextOutfit")} onClick={() => step(1)} side="right" />
      </div>

      <div className="mt-5 flex items-center justify-center gap-2.5">
        {DRESS_CODE_IMAGES.map((src, i) => (
          <button
            key={src}
            type="button"
            onClick={() => setIndex(i)}
            aria-label={t("showOutfit", { n: i + 1 })}
            aria-current={i === index}
            className={`h-1.5 rounded-full transition-all ${
              i === index ? "w-7 bg-wine" : "w-1.5 bg-ink/25 hover:bg-ink/40"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

function SlideArrow({
  label,
  onClick,
  side,
}: {
  label: string;
  onClick: () => void;
  side: "left" | "right";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`absolute top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-xl text-ink backdrop-blur transition-colors hover:bg-white hover:text-wine ${
        side === "left" ? "left-3" : "right-3"
      }`}
    >
      <span aria-hidden>{side === "left" ? "‹" : "›"}</span>
    </button>
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
  const { t } = useInviteI18n();
  return (
    <footer className="bg-ink text-white">
      <div className="mx-auto max-w-4xl px-6 py-20 text-center">
        <Ornament className="w-12 h-12 mx-auto text-white/60" />
        <p className="mt-6 font-display text-4xl md:text-5xl leading-tight">{title}</p>
        <p className="mt-4 italic text-white/70 font-display text-xl">{t("footerLine")}</p>
        <a
          href={`/invite/${token}/pdf`}
          download
          className="mt-10 inline-flex items-center gap-2 border border-white/40 px-6 py-3 text-xs uppercase tracking-[0.3em] transition-colors hover:bg-white hover:text-ink"
        >
          {t("downloadInvitation")}
          <span aria-hidden>↓</span>
        </a>

        <div className="mt-14 border-t border-white/15 pt-6">
          <DeveloperCredit tone="dark" />
        </div>
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
  const { t, longDate } = useInviteI18n();
  const [status, setStatus] = useState<string>(
    invite.rsvp.status === "pending" ? "" : invite.rsvp.status,
  );
  const [partnerFirst, setPartnerFirst] = useState(invite.invitee.partner_first_name ?? "");
  const [partnerLast, setPartnerLast] = useState(invite.invitee.partner_last_name ?? "");
  const [email, setEmail] = useState(invite.invitee.email ?? "");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deadlineLabel = useMemo(
    () => longDate(new Date(invite.deadline)),
    [invite.deadline, longDate],
  );

  if (invite.is_rsvp_closed) {
    return (
      <Reveal>
        <div className="mx-auto max-w-xl rounded-sm border border-ink/10 bg-white/60 px-8 py-12 text-center">
          <Ornament className="w-10 h-10 mx-auto text-wine/40 mb-4" />
          <h3 className="font-display text-3xl mb-2">{t("rsvpClosedTitle")}</h3>
          <p className="text-ink/60">{t("rsvpClosedBody", { date: deadlineLabel })}</p>
        </div>
      </Reveal>
    );
  }

  /** Declining guests are never asked for an address, so none is sent for them. */
  const wantsEmail = status === "accepted" || status === "maybe";

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!status) {
      setError(t("chooseOne"));
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
          partner_first_name: invite.invitee.is_couple ? partnerFirst : null,
          partner_last_name: invite.invitee.is_couple ? partnerLast : null,
          // Null leaves any address the host already had untouched.
          email: wantsEmail ? email.trim() || null : null,
        },
      });
      setSaved(true);
    } catch (err) {
      setError(err instanceof GraphQLRequestError ? err.message : t("submitFailed"));
    } finally {
      setBusy(false);
    }
  };

  const options: { value: string; label: string; sub: string }[] = [
    { value: "accepted", label: t("optionAccept"), sub: t("optionAcceptSub") },
    { value: "maybe", label: t("optionMaybe"), sub: t("optionMaybeSub") },
    { value: "declined", label: t("optionDecline"), sub: t("optionDeclineSub") },
  ];

  return (
    <Reveal>
      <form
        onSubmit={submit}
        className="mx-auto max-w-2xl rounded-sm border border-ink/10 bg-white/70 px-6 py-10 md:px-12 md:py-14 backdrop-blur"
      >
        <p className="text-center text-sm text-ink/70 mb-2">
          {t("respondBy", { date: deadlineLabel })}
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
            <Field label={t("partnerFirstName")}>
              <input
                className="invite-input"
                value={partnerFirst}
                onChange={(e) => setPartnerFirst(e.target.value)}
              />
            </Field>
            <Field label={t("partnerLastName")}>
              <input
                className="invite-input"
                value={partnerLast}
                onChange={(e) => setPartnerLast(e.target.value)}
              />
            </Field>
          </div>
        )}

        {/* Only guests who are coming (or might) need to hear about the day. */}
        {wantsEmail && (
          <div className="mt-8">
            <Field label={t("emailLabel")}>
              <input
                className="invite-input"
                type="email"
                autoComplete="email"
                inputMode="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
            <p className="mt-2 text-xs text-ink/50">{t("emailHint")}</p>
          </div>
        )}

        {error && (
          <p className="mt-6 text-center text-sm text-wine bg-wine/10 border border-wine/30 rounded-sm py-2 px-4">
            {error}
          </p>
        )}
        {saved && (
          <p className="mt-6 text-center text-sm text-sage bg-sage/10 border border-sage/30 rounded-sm py-2 px-4">
            {t("savedMessage")}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="mt-8 w-full rounded-sm bg-ink py-4 text-xs uppercase tracking-[0.35em] text-white transition-colors hover:bg-wine disabled:opacity-60"
        >
          {busy
            ? t("sending")
            : invite.rsvp.status === "pending"
              ? t("sendResponse")
              : t("updateResponse")}
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
