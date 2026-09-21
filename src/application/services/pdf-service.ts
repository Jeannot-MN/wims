import type { DataSource } from "typeorm";
import { InviteeEntity } from "@/infrastructure/db/entities/Invitee";
import { EventEntity } from "@/infrastructure/db/entities/Event";
import type { InvitePdfRenderer } from "@/infrastructure/pdf/invite-pdf-renderer";
import { guestFullName, type InviteGuestInput } from "@/domain/invite/invite-view-model";
import { ForbiddenError, NotFoundError } from "./event-service";

export class PdfService {
  constructor(private readonly dataSource: DataSource, private readonly renderer: InvitePdfRenderer) {}

  async renderByToken(token: string): Promise<{ buffer: Buffer; filename: string } | null> {
    const invitee = await this.dataSource.getRepository(InviteeEntity).findOne({
      where: { invite_token: token },
    });
    if (!invitee) return null;
    const event = await this.dataSource.getRepository(EventEntity).findOne({
      where: { id: invitee.event_id },
    });
    if (!event) return null;
    const buffer = await this.renderer.render({ event, invitee });
    return { buffer, filename: filenameFor(invitee) };
  }

  async renderForOwner(ownerId: string, inviteeId: string): Promise<{ buffer: Buffer; filename: string }> {
    const invitee = await this.dataSource.getRepository(InviteeEntity).findOne({ where: { id: inviteeId } });
    if (!invitee) throw new NotFoundError("Invitee not found");
    const event = await this.dataSource.getRepository(EventEntity).findOne({ where: { id: invitee.event_id } });
    if (!event) throw new NotFoundError("Event not found");
    if (event.owner_user_id !== ownerId) throw new ForbiddenError();
    const buffer = await this.renderer.render({ event, invitee });
    return { buffer, filename: filenameFor(invitee) };
  }
}

/** `Invitation - Yves & Grace Nkolo.pdf` — what the guest sees in their downloads. */
export function filenameFor(invitee: InviteGuestInput): string {
  return `Invitation - ${sanitizeForFilename(guestFullName(invitee))}.pdf`;
}

/**
 * Drops what a filesystem or a Content-Disposition header can't carry: path
 * separators, the Windows-reserved punctuation, and any control or format
 * character (`\p{C}`). `&` survives deliberately — it's legal everywhere and
 * couples' names read better with it.
 */
function sanitizeForFilename(name: string): string {
  const cleaned = name
    .replace(/[\p{C}/\\:*?"<>|]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || "Guest";
}
