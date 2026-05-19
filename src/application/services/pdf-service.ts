import type { DataSource } from "typeorm";
import { InviteeEntity } from "@/infrastructure/db/entities/Invitee";
import { EventEntity } from "@/infrastructure/db/entities/Event";
import type { InvitePdfRenderer } from "@/infrastructure/pdf/invite-pdf-renderer";
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
    return { buffer, filename: filenameFor(event, invitee) };
  }

  async renderForOwner(ownerId: string, inviteeId: string): Promise<{ buffer: Buffer; filename: string }> {
    const invitee = await this.dataSource.getRepository(InviteeEntity).findOne({ where: { id: inviteeId } });
    if (!invitee) throw new NotFoundError("Invitee not found");
    const event = await this.dataSource.getRepository(EventEntity).findOne({ where: { id: invitee.event_id } });
    if (!event) throw new NotFoundError("Event not found");
    if (event.owner_user_id !== ownerId) throw new ForbiddenError();
    const buffer = await this.renderer.render({ event, invitee });
    return { buffer, filename: filenameFor(event, invitee) };
  }
}

function filenameFor(event: EventEntity, invitee: InviteeEntity): string {
  const slug = `${invitee.primary_first_name}-${invitee.primary_last_name}`.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const eventSlug = event.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 30);
  return `${eventSlug}-${slug}.pdf`;
}
