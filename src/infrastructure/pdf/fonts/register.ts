/**
 * Registers Cormorant Garamond with @react-pdf so the invite can use the
 * high-contrast serif the design calls for. Falls back to the built-in
 * Times family if anything about the embedded font data goes wrong — an
 * invite that renders in the wrong typeface beats one that 500s.
 */
export const INVITE_FONT_FAMILY = "Cormorant Garamond";
export const FALLBACK_FONT_FAMILY = "Times-Roman";

let registered = false;

export async function resolveInviteFontFamily(): Promise<string> {
  if (registered) return INVITE_FONT_FAMILY;

  try {
    const [{ Font }, { CORMORANT_REGULAR_SRC }, { CORMORANT_LIGHT_SRC }] = await Promise.all([
      import("@react-pdf/renderer"),
      import("./cormorant-regular"),
      import("./cormorant-light"),
    ]);

    Font.register({
      family: INVITE_FONT_FAMILY,
      fonts: [
        { src: CORMORANT_LIGHT_SRC, fontWeight: 300 },
        { src: CORMORANT_REGULAR_SRC, fontWeight: 400 },
      ],
    });

    // Names, codes and URLs must never be broken across lines with a hyphen.
    Font.registerHyphenationCallback((word) => [word]);

    // Font sources decode lazily, so a bad blob would otherwise surface
    // half-way through renderToBuffer. Force it now, while we can still fall back.
    await Promise.all([
      Font.load({ fontFamily: INVITE_FONT_FAMILY, fontWeight: 400 }),
      Font.load({ fontFamily: INVITE_FONT_FAMILY, fontWeight: 300 }),
    ]);

    registered = true;
    return INVITE_FONT_FAMILY;
  } catch {
    return FALLBACK_FONT_FAMILY;
  }
}
