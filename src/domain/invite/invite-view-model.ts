import { RsvpDeadlinePolicy } from "@/domain/event/rsvp-deadline-policy";

/**
 * Turns an event + invitee into the flat shape the invite PDF renders.
 *
 * Pure and free of TypeORM: the inputs are structural, so this can be unit
 * tested without a database or the decorator machinery. Everything the
 * template needs — wording, formatting, sizing, density — is decided here,
 * leaving the template to place boxes.
 */

export type InviteEventInput = {
  title: string;
  starts_at: Date;
  rsvp_deadline_at: Date | null;
  address_text: string;
  formatted_address: string | null;
  dress_code: string;
  gift_registry_url: string;
  schedule: { time: string; title: string; description: string }[];
  custom_sections: { heading: string; body: string }[];
};

export type InviteGuestInput = {
  primary_first_name: string;
  primary_last_name: string;
  partner_first_name: string | null;
  partner_last_name: string | null;
  invite_token: string;
};

export type ScheduleBlockVm = {
  heading: string;
  timeLabel: string | null;
  lines: string[];
};

export type SectionRowVm = { label: string; value: string };

export type SectionVm = {
  heading: string | null;
  paragraphs: string[];
  rows: SectionRowVm[];
};

export type DensityPreset = {
  key: "comfortable" | "compact" | "dense";
  bodyFs: number;
  lineHeight: number;
  headingFs: number;
  urlFs: number;
  blockGap: number;
  rowHeight: number;
};

export type InviteViewModel = {
  front: {
    familiesLine: string;
    nameOne: string;
    nameTwo: string | null;
    nameFontSize: number;
    honourLine: string;
    guestName: string;
    joinLine: string;
    date: { weekday: string; day: string; month: string };
  };
  details: {
    rsvpSentence: string;
    inviteUrl: string;
    urlFontSize: number;
    schedule: ScheduleBlockVm[];
    sections: SectionVm[];
  };
  density: DensityPreset;
  estimatedHeight: number;
};

export const FAMILIES_LINE = "TOGETHER WITH THEIR FAMILIES";
export const HONOUR_LINE = "WOULD BE HONOURED BY THE PRESENCE OF";
export const JOIN_LINE = "TO JOIN THEM IN CELEBRATING THEIR WEDDING ON";

/** Text column of the A5 page, after the 46pt side and 44/40pt end padding. */
export const CONTENT_WIDTH = 328;
export const CONTENT_HEIGHT = 511;

export const DENSITY_PRESETS: DensityPreset[] = [
  { key: "comfortable", bodyFs: 11.5, lineHeight: 1.5, headingFs: 12.5, urlFs: 16, blockGap: 14, rowHeight: 17 },
  { key: "compact", bodyFs: 10.5, lineHeight: 1.42, headingFs: 11.5, urlFs: 15, blockGap: 10, rowHeight: 15.5 },
  { key: "dense", bodyFs: 9.5, lineHeight: 1.35, headingFs: 10.5, urlFs: 13, blockGap: 7, rowHeight: 14 },
];

/** Rough advance widths in em, calibrated for Cormorant at mixed case and tracked caps. */
const AVG_CHAR_EM = 0.45;
const CAPS_CHAR_EM = 0.62;

export function buildInviteViewModel(input: {
  event: InviteEventInput;
  invitee: InviteGuestInput;
  baseUrl?: string;
  timeZone?: string;
  deadlinePolicy?: RsvpDeadlinePolicy;
}): InviteViewModel {
  const { event, invitee } = input;
  const baseUrl = trimTrailingSlash(input.baseUrl ?? "");
  const timeZone = input.timeZone ?? "UTC";
  const policy = input.deadlinePolicy ?? new RsvpDeadlinePolicy();

  const names = parseCoupleNames(event.title);
  const inviteUrl = baseUrl ? `${baseUrl}/invite/${invitee.invite_token}` : "";
  const schedule = buildSchedule(event, timeZone);
  const sections = buildSections(event);

  const details = {
    rsvpSentence: rsvpSentence(policy.effective(event), timeZone),
    inviteUrl,
    urlFontSize: 0, // filled in below, once the density is known
    schedule,
    sections,
  };

  const density = chooseDensity(details);

  return {
    front: {
      familiesLine: FAMILIES_LINE,
      nameOne: names.one,
      nameTwo: names.two,
      nameFontSize: displayNameFontSize([names.one, names.two]),
      honourLine: HONOUR_LINE,
      guestName: guestDisplayName(invitee),
      joinLine: JOIN_LINE,
      date: dateParts(event.starts_at, timeZone),
    },
    details: { ...details, urlFontSize: urlFontSize(inviteUrl, density.urlFs) },
    density,
    estimatedHeight: estimateDetailsHeight(details, density),
  };
}

/**
 * "Yves & Grace's Wedding" -> YVES / GRACE. Only the first token of each side
 * is kept so two long full names don't shrink the display line to nothing.
 */
export function parseCoupleNames(title: string): { one: string; two: string | null } {
  let t = title.trim();
  if (!t) return { one: "OUR WEDDING", two: null };

  t = t.replace(/^the\s+wedding\s+of\s+/i, "");
  t = t.replace(/\s*['’]s\s+wedding\s*$/i, "");
  t = t.replace(/\s+wedding\s*$/i, "");
  t = t.trim();
  if (!t) return { one: "OUR WEDDING", two: null };

  const match = t.match(/^(.+?)\s+(?:&|and|\+)\s+(.+)$/i);
  if (!match) return { one: t.toUpperCase(), two: null };

  const one = firstToken(match[1] ?? "");
  const two = firstToken(match[2] ?? "");
  if (!one || !two) return { one: t.toUpperCase(), two: null };
  return { one: one.toUpperCase(), two: two.toUpperCase() };
}

export function guestDisplayName(invitee: InviteGuestInput): string {
  const first = invitee.primary_first_name.trim();
  const last = invitee.primary_last_name.trim();
  const partnerFirst = (invitee.partner_first_name ?? "").trim();
  const partnerLast = (invitee.partner_last_name ?? "").trim();

  if (!first && !partnerFirst) return "OUR HONOURED GUEST";

  if (partnerFirst) {
    // Shared surname reads better collapsed: "YVES & GRACE NKOLO".
    if (!partnerLast || partnerLast.toLowerCase() === last.toLowerCase()) {
      return join([`${first} & ${partnerFirst}`, last]).toUpperCase();
    }
    return `${join([first, last])} & ${join([partnerFirst, partnerLast])}`.toUpperCase();
  }

  return join([first, last]).toUpperCase();
}

export function dateParts(date: Date, timeZone: string): { weekday: string; day: string; month: string } {
  const d = new Date(date);
  return {
    weekday: fmt(d, timeZone, { weekday: "long" }).toUpperCase(),
    day: fmt(d, timeZone, { day: "2-digit" }),
    month: fmt(d, timeZone, { month: "long" }).toUpperCase(),
  };
}

/** "the 20th of September 2026" */
export function ordinalDate(date: Date, timeZone: string): string {
  const d = new Date(date);
  const day = Number(fmt(d, timeZone, { day: "numeric" }));
  const month = fmt(d, timeZone, { month: "long" });
  const year = fmt(d, timeZone, { year: "numeric" });
  return `the ${day}${ordinalSuffix(day)} of ${month} ${year}`;
}

export function ordinalSuffix(n: number): string {
  if (n % 100 >= 11 && n % 100 <= 13) return "th";
  if (n % 10 === 1) return "st";
  if (n % 10 === 2) return "nd";
  if (n % 10 === 3) return "rd";
  return "th";
}

export function rsvpSentence(deadline: Date, timeZone: string): string {
  return `Please RSVP by ${ordinalDate(deadline, timeZone)} by opening the link below and confirming your attendance:`;
}

/**
 * Splits a custom section body into prose and, where the host wrote a run of
 * "Label: Value" lines (bank details, contacts), a two-column table. A lone
 * labelled line stays prose — "Contact: 082 555 1234" reads better as a sentence
 * than as a one-row table.
 */
export function parseSectionBody(body: string): { paragraphs: string[]; rows: SectionRowVm[] } {
  const lines = body
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const paragraphs: string[] = [];
  const rows: SectionRowVm[] = [];
  let run: SectionRowVm[] = [];
  let runSources: string[] = [];

  const flush = () => {
    if (run.length >= 2) rows.push(...run);
    else paragraphs.push(...runSources);
    run = [];
    runSources = [];
  };

  for (const line of lines) {
    const row = asRow(line);
    if (row) {
      run.push(row);
      runSources.push(line);
    } else {
      flush();
      paragraphs.push(line);
    }
  }
  flush();

  return { paragraphs, rows };
}

function asRow(line: string): SectionRowVm | null {
  if (line.length >= 60) return null;
  const match = line.match(/^([^:]{1,28}):\s*(.+)$/);
  if (!match) return null;
  const label = (match[1] ?? "").trim();
  const value = (match[2] ?? "").trim();
  if (!label || !value) return null;
  if (label.split(/\s+/).length > 4) return null;
  if (value.startsWith("//")) return null; // a bare URL, split at its scheme
  return { label, value };
}

/** Display names shrink to fit the 328pt column, floored so they stay a statement. */
export function displayNameFontSize(names: (string | null)[]): number {
  const longest = Math.max(1, ...names.filter((n): n is string => !!n).map((n) => n.length));
  const fitted = Math.floor((CONTENT_WIDTH - 28) / (CAPS_CHAR_EM * longest));
  return clamp(fitted, 30, 62);
}

export function urlFontSize(url: string, preferred: number): number {
  if (!url) return preferred;
  const fitted = Math.floor((CONTENT_WIDTH - 12) / (0.48 * url.length));
  return clamp(Math.min(preferred, fitted), 9, preferred);
}

export function chooseDensity(details: {
  rsvpSentence: string;
  inviteUrl: string;
  schedule: ScheduleBlockVm[];
  sections: SectionVm[];
}): DensityPreset {
  for (const preset of DENSITY_PRESETS) {
    if (estimateDetailsHeight(details, preset) <= CONTENT_HEIGHT) return preset;
  }
  return DENSITY_PRESETS[DENSITY_PRESETS.length - 1] as DensityPreset;
}

export function estimateDetailsHeight(
  details: { rsvpSentence: string; inviteUrl: string; schedule: ScheduleBlockVm[]; sections: SectionVm[] },
  preset: DensityPreset,
): number {
  const lineH = preset.bodyFs * preset.lineHeight;
  const charsPerLine = Math.max(10, Math.floor(CONTENT_WIDTH / (preset.bodyFs * AVG_CHAR_EM)));
  const wrapped = (text: string) => Math.max(1, Math.ceil(text.length / charsPerLine));

  let height = wrapped(details.rsvpSentence) * lineH;
  if (details.inviteUrl) height += urlFontSize(details.inviteUrl, preset.urlFs) * 1.3 + 22;

  for (const block of details.schedule) {
    height += preset.headingFs * 1.4 + block.lines.length * lineH + preset.blockGap;
  }

  if (details.sections.length) height += 32; // the diamond divider

  for (const section of details.sections) {
    if (section.heading) height += preset.headingFs * 1.4;
    for (const p of section.paragraphs) height += wrapped(p) * lineH;
    height += section.rows.length * preset.rowHeight;
    height += preset.blockGap;
  }

  return height;
}

function buildSchedule(event: InviteEventInput, timeZone: string): ScheduleBlockVm[] {
  const items = event.schedule ?? [];
  if (items.length) {
    return items.map((item) => ({
      heading: item.title.trim().toUpperCase() || "SCHEDULE",
      timeLabel: normaliseClock(item.time),
      lines: item.description
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean),
    }));
  }

  // No schedule: synthesise the ceremony from the event's own time and address.
  const venue = (event.formatted_address ?? event.address_text ?? "").trim();
  const comma = venue.indexOf(",");
  const lines = !venue ? [] : comma === -1 ? [venue] : [venue.slice(0, comma).trim(), venue.slice(comma + 1).trim()];

  return [
    {
      heading: "CEREMONY",
      timeLabel: normaliseClock(fmt(new Date(event.starts_at), timeZone, { hour: "2-digit", minute: "2-digit", hour12: false })),
      lines,
    },
  ];
}

function buildSections(event: InviteEventInput): SectionVm[] {
  const sections = (event.custom_sections ?? [])
    .map((section) => {
      const { paragraphs, rows } = parseSectionBody(section.body ?? "");
      const heading = (section.heading ?? "").trim();
      return { heading: heading ? heading.toUpperCase() : null, paragraphs, rows };
    })
    .filter((s) => s.heading || s.paragraphs.length || s.rows.length);

  if (sections.length) return sections;

  const fallback: SectionVm[] = [];
  if (event.gift_registry_url.trim()) {
    fallback.push({
      heading: "GIFTS",
      paragraphs: ["We would be delighted if you visited our registry:", event.gift_registry_url.trim()],
      rows: [],
    });
  }
  if (event.dress_code.trim()) {
    fallback.push({ heading: "DRESS", paragraphs: [event.dress_code.trim()], rows: [] });
  }
  return fallback;
}

/** "10:00" -> "10:00 AM", "15:30" -> "3:30 PM". Anything unrecognised passes through. */
export function normaliseClock(time: string): string | null {
  const t = (time ?? "").trim();
  if (!t) return null;

  const withMeridiem = t.match(/^(\d{1,2}):(\d{2})\s*([ap])\.?m\.?$/i);
  if (withMeridiem) {
    return `${Number(withMeridiem[1])}:${withMeridiem[2]} ${(withMeridiem[3] ?? "").toUpperCase()}M`;
  }

  const clock = t.match(/^(\d{1,2}):(\d{2})$/);
  if (clock) {
    const hour = Number(clock[1]);
    if (hour > 23) return t;
    const meridiem = hour < 12 ? "AM" : "PM";
    const display = hour % 12 === 0 ? 12 : hour % 12;
    return `${display}:${clock[2]} ${meridiem}`;
  }

  return t;
}

function firstToken(s: string): string {
  return s.trim().split(/\s+/)[0] ?? "";
}

function join(parts: string[]): string {
  return parts.filter(Boolean).join(" ");
}

function trimTrailingSlash(s: string): string {
  return s.replace(/\/+$/, "");
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function fmt(date: Date, timeZone: string, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone, ...options }).format(date);
}
