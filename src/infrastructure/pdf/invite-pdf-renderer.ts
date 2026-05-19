import type { EventEntity } from "@/infrastructure/db/entities/Event";
import type { InviteeEntity } from "@/infrastructure/db/entities/Invitee";

export interface InvitePdfRenderer {
  render(input: { event: EventEntity; invitee: InviteeEntity }): Promise<Buffer>;
}

// @react-pdf/renderer's deep deps have CJS/ESM interop issues — load lazily to
// keep the top-level import graph clean.
export class WeddingInvitePdfRenderer implements InvitePdfRenderer {
  async render(input: { event: EventEntity; invitee: InviteeEntity }): Promise<Buffer> {
    const [{ default: React }, { renderToBuffer }, { WeddingInvitationDoc }] = await Promise.all([
      import("react"),
      import("@react-pdf/renderer"),
      import("./wedding-template"),
    ]);
    const element = React.createElement(WeddingInvitationDoc, {
      event: input.event,
      invitee: input.invitee,
    }) as unknown as Parameters<typeof renderToBuffer>[0];
    return await renderToBuffer(element);
  }
}
