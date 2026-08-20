import type { EventEntity } from "@/infrastructure/db/entities/Event";
import type { InviteeEntity } from "@/infrastructure/db/entities/Invitee";

export interface InvitePdfRenderer {
  render(input: { event: EventEntity; invitee: InviteeEntity }): Promise<Buffer>;
}

// @react-pdf/renderer's deep deps have CJS/ESM interop issues — load lazily to
// keep the top-level import graph clean.
export class WeddingInvitePdfRenderer implements InvitePdfRenderer {
  async render(input: { event: EventEntity; invitee: InviteeEntity }): Promise<Buffer> {
    const [{ default: React }, { renderToBuffer }, { WeddingInvitationDoc }, { resolveInviteFontFamily }] =
      await Promise.all([
        import("react"),
        import("@react-pdf/renderer"),
        import("./wedding-template"),
        import("./fonts/register"),
      ]);
    // Registration is global and idempotent — do it here, once per container,
    // never inside a render function.
    const fontFamily = await resolveInviteFontFamily();
    const element = React.createElement(WeddingInvitationDoc, {
      event: input.event,
      invitee: input.invitee,
      baseUrl: process.env.APP_BASE_URL ?? "",
      // No per-event timezone in the schema; INVITE_TIMEZONE lets a deployment
      // print local times instead of UTC.
      timeZone: process.env.INVITE_TIMEZONE ?? "UTC",
      fontFamily,
    }) as unknown as Parameters<typeof renderToBuffer>[0];
    return await renderToBuffer(element);
  }
}
