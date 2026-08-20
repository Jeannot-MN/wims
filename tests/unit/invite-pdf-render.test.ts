import { describe, expect, it } from "vitest";
import { extractPdfText } from "../helpers/pdf-text";
import type { EventEntity } from "@/infrastructure/db/entities/Event";
import type { InviteeEntity } from "@/infrastructure/db/entities/Invitee";
import { FALLBACK_FONT_FAMILY } from "@/infrastructure/pdf/fonts/register";

const event = {
  title: "Yves & Grace's Wedding",
  starts_at: new Date("2026-10-03T08:00:00Z"),
  rsvp_deadline_at: new Date("2026-09-20T12:00:00Z"),
  address_text: "",
  formatted_address: "Kirstenbosch Garden, Rhodes Drive, Newlands",
  dress_code: "",
  gift_registry_url: "",
  schedule: [
    { time: "10:00", title: "Ceremony", description: "Capetown Christian Tabernacle\n39 De Villiers Street, Parow Valley" },
    { time: "15:30", title: "Reception", description: "Kirstenbosch National Botanical Garden\nRhodes Drive, Newlands" },
  ],
  custom_sections: [
    {
      heading: "",
      body: [
        "We would sincerely appreciate envelopes as our preferred form of gifts.",
        "Bank: FNB/RMB",
        "Account Holder: Yves Nkolo",
        "Account Number: 6312 5399 443",
      ].join("\n"),
    },
  ],
} as unknown as EventEntity;

const invitee = {
  primary_first_name: "Jeannot",
  primary_last_name: "Ngalula",
  partner_first_name: null,
  partner_last_name: null,
  invite_token: "RY2xrJab7Q",
} as unknown as InviteeEntity;

async function render(fontFamily?: string): Promise<Buffer> {
  const [{ default: React }, { renderToBuffer }, { WeddingInvitationDoc }, { resolveInviteFontFamily }] =
    await Promise.all([
      import("react"),
      import("@react-pdf/renderer"),
      import("@/infrastructure/pdf/wedding-template"),
      import("@/infrastructure/pdf/fonts/register"),
    ]);

  const element = React.createElement(WeddingInvitationDoc, {
    event,
    invitee,
    baseUrl: "http://localhost:3000",
    timeZone: "UTC",
    fontFamily: fontFamily ?? (await resolveInviteFontFamily()),
  }) as unknown as Parameters<typeof renderToBuffer>[0];

  return await renderToBuffer(element);
}

describe("wedding invitation PDF", () => {
  it("renders two pages with the bundled font embedded", async () => {
    const buf = await render();
    const raw = buf.toString("latin1");

    expect(buf.subarray(0, 4).toString()).toBe("%PDF");
    expect(buf.length).toBeGreaterThan(20_000);
    expect(raw).toMatch(/\/Count\s+2/);
    // A silent fallback to Times would leave no Cormorant font descriptor.
    expect(raw).toMatch(/Cormorant/);
  });

  it("puts the guest, venues and bank details on the page", async () => {
    // Text is only greppable with a standard-14 font: embedded TrueType subsets
    // are written as hex glyph indices. This also covers the fallback path.
    const text = extractPdfText(await render(FALLBACK_FONT_FAMILY));

    expect(text).toContain("YVES");
    expect(text).toContain("GRACE");
    expect(text).toContain("JEANNOT NGALULA");
    expect(text).toContain("SATURDAY");
    expect(text).toContain("CEREMONY - 10:00 AM");
    expect(text).toContain("RECEPTION - 3:30 PM");
    expect(text).toContain("Account Number");
    expect(text).toContain("6312 5399 443");
    expect(text).toContain("the 20th of September 2026");
    expect(text).toContain("http://localhost:3000/invite/RY2xrJab7Q");
    // The bare "Code: <token>" line was dropped from the front — the RSVP URL carries the token.
    expect(text).not.toContain("Code:");

    // Date row is weekday / day / month — no year.
    expect(text).toContain("OCTOBER");
    expect(text).not.toContain("OCTOBER 2026");

    // Schedule descriptions keep the case the host typed; only the heading is caps.
    expect(text).toContain("Capetown Christian Tabernacle");
    // extractPdfText doubles the space at text-run boundaries, so match past it.
    expect(text).toContain("De Villiers Street, Parow Valley");
    expect(text).not.toContain("CAPETOWN CHRISTIAN TABERNACLE");
  });
});
