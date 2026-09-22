import { describe, expect, it } from "vitest";
import {
  LOCALES,
  STRINGS,
  isLocale,
  pickLocalised,
  translate,
  type StringKey,
} from "@/web/client/invite-strings";
import { BANK_DETAILS, GIFTS_PARAGRAPHS, GUEST_NOTES } from "@/domain/invite/wedding-content";

describe("invite translations", () => {
  it("covers every English key in French", () => {
    const en = Object.keys(STRINGS.en).sort();
    const fr = Object.keys(STRINGS.fr).sort();
    expect(fr).toEqual(en);
  });

  it("leaves no string empty in either language", () => {
    for (const locale of LOCALES) {
      for (const [key, value] of Object.entries(STRINGS[locale])) {
        expect(value.trim(), `${locale}.${key}`).not.toBe("");
      }
    }
  });

  it("keeps the same placeholders in both languages", () => {
    const placeholders = (s: string) => (s.match(/\{(\w+)\}/g) ?? []).sort();
    for (const key of Object.keys(STRINGS.en) as StringKey[]) {
      expect(placeholders(STRINGS.fr[key]), key).toEqual(placeholders(STRINGS.en[key]));
    }
  });

  it("actually differs — no key left untranslated by copy-paste", () => {
    const shared = (Object.keys(STRINGS.en) as StringKey[]).filter(
      (key) => STRINGS.en[key] === STRINGS.fr[key],
    );
    // "RSVP" and "Minutes" are genuinely the same word in both languages.
    expect(shared).toEqual(["navRsvp", "countdownMinutes", "rsvpTitle"]);
  });
});

describe("translate", () => {
  it("returns the string for the locale", () => {
    expect(translate("en", "navHome")).toBe("Home");
    expect(translate("fr", "navHome")).toBe("Accueil");
  });

  it("substitutes placeholders", () => {
    expect(translate("en", "heroInvited", { name: "Benita" })).toBe("Dear Benita, you are invited");
    expect(translate("fr", "showOutfit", { n: 3 })).toBe("Afficher la tenue 3");
  });

  it("leaves an unknown placeholder untouched rather than printing undefined", () => {
    expect(translate("en", "respondBy", {})).toContain("{date}");
  });
});

describe("pickLocalised", () => {
  it("uses the original in English", () => {
    expect(pickLocalised("en", "Ceremony", "Cérémonie")).toBe("Ceremony");
  });

  it("uses the translation in French", () => {
    expect(pickLocalised("fr", "Ceremony", "Cérémonie")).toBe("Cérémonie");
  });

  it("falls back to the original when the host left the French blank", () => {
    expect(pickLocalised("fr", "Ceremony", "")).toBe("Ceremony");
    expect(pickLocalised("fr", "Ceremony", "   ")).toBe("Ceremony");
    expect(pickLocalised("fr", "Ceremony", null)).toBe("Ceremony");
    expect(pickLocalised("fr", "Ceremony", undefined)).toBe("Ceremony");
  });
});

describe("isLocale", () => {
  it("accepts only the supported locales", () => {
    expect(isLocale("en")).toBe(true);
    expect(isLocale("fr")).toBe(true);
    expect(isLocale("de")).toBe(false);
    expect(isLocale(null)).toBe(false);
  });
});

describe("hard-coded wedding content", () => {
  it("is translated in full", () => {
    expect(GIFTS_PARAGRAPHS.fr).toHaveLength(GIFTS_PARAGRAPHS.en.length);
    expect(GUEST_NOTES.fr).toHaveLength(GUEST_NOTES.en.length);
    for (const row of BANK_DETAILS) {
      expect(row.label_fr.trim()).not.toBe("");
      expect(row.label_fr).not.toBe(row.label);
    }
  });

  it("keeps the bank values identical across languages — only labels translate", () => {
    expect(BANK_DETAILS.map((r) => r.value)).toEqual([
      "FNB / First National Bank",
      "Miss Nyunga N Kayembe",
      "63041228271",
    ]);
  });
});
