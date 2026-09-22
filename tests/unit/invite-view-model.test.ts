import { describe, expect, it } from "vitest";
import {
  buildInviteViewModel,
  displayNameFontSize,
  guestDisplayName,
  guestFullName,
  ordinalSuffix,
  parseCoupleNames,
  parseSectionBody,
  type InviteEventInput,
  type InviteGuestInput,
} from "@/domain/invite/invite-view-model";
import { BANK_DETAILS, GIFTS_PARAGRAPHS, GUEST_NOTES } from "@/domain/invite/wedding-content";

function makeEvent(overrides: Partial<InviteEventInput> = {}): InviteEventInput {
  return {
    title: "Yves & Grace's Wedding",
    starts_at: new Date("2026-10-03T08:00:00Z"),
    rsvp_deadline_at: new Date("2026-09-20T12:00:00Z"),
    address_text: "",
    formatted_address: "Kirstenbosch Garden, Rhodes Drive, Newlands",
    dress_code: "",
    gift_registry_url: "",
    schedule: [],
    custom_sections: [],
    ...overrides,
  };
}

function makeInvitee(overrides: Partial<InviteGuestInput> = {}): InviteGuestInput {
  return {
    primary_first_name: "Jeannot",
    primary_last_name: "Ngalula",
    partner_first_name: null,
    partner_last_name: null,
    invite_token: "RY2xrJab7Q",
    ...overrides,
  };
}

function build(event: Partial<InviteEventInput> = {}, invitee: Partial<InviteGuestInput> = {}) {
  return buildInviteViewModel({
    event: makeEvent(event),
    invitee: makeInvitee(invitee),
    baseUrl: "http://localhost:3000",
  });
}

describe("parseCoupleNames", () => {
  it("splits a possessive couple title", () => {
    expect(parseCoupleNames("Yves & Grace's Wedding")).toEqual({ one: "YVES", two: "GRACE" });
  });

  it("handles 'The Wedding of X and Y'", () => {
    expect(parseCoupleNames("The Wedding of Yves and Grace")).toEqual({ one: "YVES", two: "GRACE" });
  });

  it("keeps only the first name of each side", () => {
    expect(parseCoupleNames("Yves Nkolo & Grace Moyo")).toEqual({ one: "YVES", two: "GRACE" });
  });

  it("falls back to the whole title when there is no couple separator", () => {
    expect(parseCoupleNames("Harvest Feast")).toEqual({ one: "HARVEST FEAST", two: null });
  });

  it("survives an empty title", () => {
    expect(parseCoupleNames("   ")).toEqual({ one: "OUR WEDDING", two: null });
  });
});

describe("guestDisplayName", () => {
  it("renders a single guest", () => {
    expect(guestDisplayName(makeInvitee())).toBe("JEANNOT NGALULA");
  });

  it("collapses a shared surname", () => {
    const name = guestDisplayName(
      makeInvitee({
        primary_first_name: "Yves",
        primary_last_name: "Nkolo",
        partner_first_name: "Grace",
        partner_last_name: "Nkolo",
      }),
    );
    expect(name).toBe("YVES & GRACE NKOLO");
  });

  it("keeps both surnames when they differ", () => {
    const name = guestDisplayName(
      makeInvitee({
        primary_first_name: "Yves",
        primary_last_name: "Nkolo",
        partner_first_name: "Grace",
        partner_last_name: "Moyo",
      }),
    );
    expect(name).toBe("YVES NKOLO & GRACE MOYO");
  });

  it("addresses a nameless guest", () => {
    expect(guestDisplayName(makeInvitee({ primary_first_name: "", primary_last_name: "" }))).toBe(
      "OUR HONOURED GUEST",
    );
  });
});

describe("guestFullName", () => {
  it("keeps the case the host typed", () => {
    expect(guestFullName(makeInvitee())).toBe("Jeannot Ngalula");
  });

  it("collapses a shared surname", () => {
    const name = guestFullName(
      makeInvitee({
        primary_first_name: "Yves",
        primary_last_name: "Nkolo",
        partner_first_name: "Grace",
        partner_last_name: "Nkolo",
      }),
    );
    expect(name).toBe("Yves & Grace Nkolo");
  });

  it("keeps both surnames when they differ", () => {
    const name = guestFullName(
      makeInvitee({
        primary_first_name: "Yves",
        primary_last_name: "Nkolo",
        partner_first_name: "Grace",
        partner_last_name: "Moyo",
      }),
    );
    expect(name).toBe("Yves Nkolo & Grace Moyo");
  });

  it("falls back to a neutral label when there is no name at all", () => {
    expect(guestFullName(makeInvitee({ primary_first_name: "", primary_last_name: "" }))).toBe("Guest");
  });
});

describe("dates", () => {
  it("formats the date row", () => {
    // No year — the date row is weekday / day / month only.
    expect(build().front.date).toEqual({ weekday: "SATURDAY", day: "03", month: "OCTOBER" });
  });

  it("formats in UTC, not the machine timezone", () => {
    // 22:00Z on the 3rd is already the 4th in Sydney and still the 3rd in Cape Town.
    const vm = build({ starts_at: new Date("2026-10-03T22:00:00Z") });
    expect(vm.front.date.day).toBe("03");
    expect(vm.front.date.weekday).toBe("SATURDAY");
  });

  it.each([
    [1, "st"],
    [2, "nd"],
    [3, "rd"],
    [4, "th"],
    [11, "th"],
    [12, "th"],
    [13, "th"],
    [21, "st"],
    [22, "nd"],
    [23, "rd"],
    [30, "th"],
    [31, "st"],
  ])("ordinal suffix for %i is %s", (n, suffix) => {
    expect(ordinalSuffix(n)).toBe(suffix);
  });

  it("uses the explicit RSVP deadline", () => {
    expect(build().details.rsvpSentence).toContain("the 20th of September 2026");
  });

  it("falls back to the deadline policy when no deadline is set", () => {
    const vm = build({ rsvp_deadline_at: null });
    expect(vm.details.rsvpSentence).toContain("the 3rd of September 2026");
  });
});

describe("schedule", () => {
  it("is not rendered on the invite, whatever the host entered", () => {
    const vm = build({
      schedule: [
        {
          time: "10:00",
          title: "Ceremony",
          description: "Capetown Christian Tabernacle\n39 De Villiers Street, Parow Valley",
        },
      ],
    });
    expect(vm.details).not.toHaveProperty("schedule");
    const text = JSON.stringify(vm);
    expect(text).not.toContain("CEREMONY");
    expect(text).not.toContain("Capetown Christian Tabernacle");
  });
});

describe("gifts", () => {
  it("always leads the details page with the hard-coded bank block", () => {
    const gifts = build().details.sections[0];
    expect(gifts?.heading).toBe("GIFTS");
    expect(gifts?.paragraphs).toEqual(GIFTS_PARAGRAPHS.en);
    expect(gifts?.rows).toEqual(BANK_DETAILS.map((r) => ({ label: r.label, value: r.value })));
  });

  it("drops a host's own gifts section rather than printing two", () => {
    const vm = build({
      custom_sections: [
        { heading: "Gifts", body: "Bank: Some Other Bank\nAccount Number: 123456789" },
        { heading: "Church Address", body: "40 3rd St La Rochelle" },
      ],
    });
    expect(vm.details.sections.map((s) => s.heading)).toEqual(["GIFTS", "CHURCH ADDRESS", null, null]);
    expect(JSON.stringify(vm.details.sections)).not.toContain("Some Other Bank");
  });
});

describe("guest notes", () => {
  it("closes the details page with the children and dress-code notes", () => {
    const notes = build().details.sections.slice(-2);
    expect(notes.map((s) => s.heading)).toEqual([null, null]);
    expect(notes.map((s) => s.paragraphs[0])).toEqual(GUEST_NOTES.en);
    expect(GUEST_NOTES.en[0]).toContain("NO CHILDREN");
    expect(GUEST_NOTES.en[1]).toContain("decently and modestly");
    // The PDF stays English even though the web invitation can switch.
    expect(GUEST_NOTES.fr).toHaveLength(GUEST_NOTES.en.length);
  });

  it("keeps them last, after the host's own sections", () => {
    const vm = build({ custom_sections: [{ heading: "Church Address", body: "40 3rd St La Rochelle" }] });
    expect(vm.details.sections.map((s) => s.heading)).toEqual(["GIFTS", "CHURCH ADDRESS", null, null]);
  });
});

describe("parseSectionBody", () => {
  it("splits prose from a run of labelled lines", () => {
    const body = [
      "We would sincerely appreciate envelopes as our preferred form of gifts.",
      "Bank: FNB/RMB",
      "Account Holder: Yves Nkolo",
      "Account Type: Savings Account",
      "Account Number: 6312 5399 443",
      "Branch Code: 250 655",
      "Reference: Your Name",
    ].join("\n");

    const parsed = parseSectionBody(body);
    expect(parsed.paragraphs).toHaveLength(1);
    expect(parsed.rows).toHaveLength(6);
    expect(parsed.rows[0]).toEqual({ label: "Bank", value: "FNB/RMB" });
    expect(parsed.rows[5]?.label).toBe("Reference");
  });

  it("does not mistake a bare URL for a label/value row", () => {
    const parsed = parseSectionBody("https://example.com/registry\nhttps://example.com/other");
    expect(parsed.rows).toHaveLength(0);
    expect(parsed.paragraphs).toHaveLength(2);
  });

  it("keeps a lone labelled line as prose", () => {
    const parsed = parseSectionBody("Contact: 082 555 1234");
    expect(parsed.rows).toHaveLength(0);
    expect(parsed.paragraphs).toEqual(["Contact: 082 555 1234"]);
  });
});

describe("sections", () => {
  it("falls back to the registry when there are no custom sections", () => {
    const vm = build({ gift_registry_url: "https://registry.example/list" });
    expect(vm.details.sections.map((s) => s.heading)).toEqual(["GIFTS", "REGISTRY", null, null]);
    expect(vm.details.sections[1]?.paragraphs).toContain("https://registry.example/list");
  });

  it("ignores the event's dress code, which the notes now carry", () => {
    const vm = build({ dress_code: "Strictly black tie" });
    expect(JSON.stringify(vm.details.sections)).not.toContain("Strictly black tie");
  });

  it("renders a sensible details page for a completely empty event", () => {
    const vm = build({
      formatted_address: null,
      address_text: "",
      schedule: [],
      custom_sections: [],
      dress_code: "",
      gift_registry_url: "",
    });
    expect(vm.details.sections.map((s) => s.heading)).toEqual(["GIFTS", null, null]);
    expect(vm.details.rsvpSentence).not.toBe("");
  });
});

describe("view model wiring", () => {
  it("builds the invite URL without a double slash and keeps token case", () => {
    const vm = buildInviteViewModel({
      event: makeEvent(),
      invitee: makeInvitee(),
      baseUrl: "http://localhost:3000/",
    });
    expect(vm.details.inviteUrl).toBe("http://localhost:3000/invite/RY2xrJab7Q");
  });

  it("omits the URL when no base URL is configured", () => {
    const vm = buildInviteViewModel({ event: makeEvent(), invitee: makeInvitee() });
    expect(vm.details.inviteUrl).toBe("");
  });

  it("shrinks display names to fit the column", () => {
    const short = displayNameFontSize(["YVES", "GRACE"]);
    const long = displayNameFontSize(["CHRISTOPHER", "ALEXANDRA"]);
    expect(short).toBe(62);
    expect(long).toBeLessThan(short);
    expect(long).toBeGreaterThanOrEqual(30);
    expect(displayNameFontSize(["ABCDEFGHIJKLMNOPQRST"])).toBe(30);
  });

  it("picks a denser preset as content grows", () => {
    expect(build().density.key).toBe("comfortable");

    const busy = build({
      custom_sections: [
        {
          heading: "",
          body: [
            "We would sincerely appreciate envelopes as our preferred form of gifts. For those who may wish to transfer, our bank details are below for your convenience.",
            "Bank: FNB/RMB",
            "Account Holder: Yves Nkolo",
            "Account Type: Savings Account",
            "Account Number: 6312 5399 443",
            "Branch Code: 250 655",
            "Reference: Your Name",
          ].join("\n"),
        },
        { heading: "", body: "For more information, please contact\nBr Arthur: +27 79 529 3393\nBr Joel: +27 82 385 8565" },
      ],
    });
    expect(busy.density.key).toBe("compact");
  });
});
