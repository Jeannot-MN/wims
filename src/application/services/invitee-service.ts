import type { DataSource, EntityManager } from "typeorm";
import { InviteeEntity } from "@/infrastructure/db/entities/Invitee";
import { EventEntity } from "@/infrastructure/db/entities/Event";
import { RsvpEntity } from "@/infrastructure/db/entities/Rsvp";
import { InviteTokenGenerator } from "@/domain/invitee/invite-token-generator";
import { InviteeContactPolicy } from "@/domain/invitee/invitee-contact-policy";
import { ForbiddenError, NotFoundError } from "./event-service";

const MAX_TOKEN_RETRIES = 5;

export type InviteeInput = {
  primary_first_name: string;
  primary_last_name: string;
  partner_first_name?: string | null;
  partner_last_name?: string | null;
  email?: string | null;
  mobile_no?: string | null;
};

export class InviteeService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly tokens: InviteTokenGenerator,
    private readonly contactPolicy = new InviteeContactPolicy(),
  ) {}

  async add(ownerId: string, eventId: string, input: InviteeInput): Promise<InviteeEntity> {
    await this.requireOwnedEvent(ownerId, eventId);
    this.validateContact(input);
    return await this.dataSource.transaction(async (mgr) => {
      const invitee = await this.createInviteeIn(mgr, eventId, input);
      const rsvp = mgr.create(RsvpEntity, { invitee_id: invitee.id });
      await mgr.save(rsvp);
      return invitee;
    });
  }

  async update(ownerId: string, inviteeId: string, input: Partial<InviteeInput>): Promise<InviteeEntity> {
    const invitee = await this.dataSource.getRepository(InviteeEntity).findOne({ where: { id: inviteeId } });
    if (!invitee) throw new NotFoundError("Invitee not found");
    await this.requireOwnedEvent(ownerId, invitee.event_id);
    const merged = { ...invitee, ...input };
    this.validateContact({
      primary_first_name: merged.primary_first_name ?? "",
      primary_last_name: merged.primary_last_name ?? "",
      email: merged.email ?? undefined,
      mobile_no: merged.mobile_no ?? undefined,
    });
    Object.assign(invitee, sanitiseUpdate(input));
    return await this.dataSource.getRepository(InviteeEntity).save(invitee);
  }

  async remove(ownerId: string, inviteeId: string): Promise<void> {
    const invitee = await this.dataSource.getRepository(InviteeEntity).findOne({ where: { id: inviteeId } });
    if (!invitee) throw new NotFoundError("Invitee not found");
    await this.requireOwnedEvent(ownerId, invitee.event_id);
    await this.dataSource.getRepository(InviteeEntity).delete({ id: inviteeId });
  }

  async listForEvent(ownerId: string, eventId: string): Promise<InviteeEntity[]> {
    await this.requireOwnedEvent(ownerId, eventId);
    return await this.dataSource.getRepository(InviteeEntity).find({
      where: { event_id: eventId },
      order: { created_at: "ASC" },
    });
  }

  async findByToken(token: string): Promise<InviteeEntity | null> {
    return await this.dataSource.getRepository(InviteeEntity).findOne({ where: { invite_token: token } });
  }

  async createInviteeIn(
    mgr: EntityManager,
    eventId: string,
    input: InviteeInput,
  ): Promise<InviteeEntity> {
    let lastErr: unknown = null;
    for (let attempt = 0; attempt < MAX_TOKEN_RETRIES; attempt++) {
      const token = this.tokens.generate();
      try {
        return await mgr.save(
          mgr.create(InviteeEntity, {
            event_id: eventId,
            invite_token: token,
            primary_first_name: input.primary_first_name.trim(),
            primary_last_name: input.primary_last_name.trim(),
            partner_first_name: input.partner_first_name?.trim() || null,
            partner_last_name: input.partner_last_name?.trim() || null,
            email: input.email?.trim() || null,
            mobile_no: input.mobile_no?.trim() || null,
          }),
        );
      } catch (err: unknown) {
        lastErr = err;
        if (!isUniqueViolation(err, "invitees_token_idx")) throw err;
      }
    }
    throw lastErr ?? new Error("Failed to generate unique invite token");
  }

  private validateContact(input: InviteeInput): void {
    const result = this.contactPolicy.validate({
      first_name: input.primary_first_name,
      last_name: input.primary_last_name,
      email: input.email,
      mobile_no: input.mobile_no,
    });
    if (result.kind === "error") {
      throw new Error(`Invalid invitee: ${result.reason.replace("_", " ")}`);
    }
  }

  private async requireOwnedEvent(ownerId: string, eventId: string): Promise<EventEntity> {
    const evt = await this.dataSource.getRepository(EventEntity).findOne({ where: { id: eventId } });
    if (!evt) throw new NotFoundError("Event not found");
    if (evt.owner_user_id !== ownerId) throw new ForbiddenError();
    return evt;
  }
}

function sanitiseUpdate(input: Partial<InviteeInput>): Partial<InviteeEntity> {
  const out: Partial<InviteeEntity> = {};
  if (input.primary_first_name !== undefined) out.primary_first_name = input.primary_first_name.trim();
  if (input.primary_last_name !== undefined) out.primary_last_name = input.primary_last_name.trim();
  if (input.partner_first_name !== undefined) out.partner_first_name = input.partner_first_name?.trim() || null;
  if (input.partner_last_name !== undefined) out.partner_last_name = input.partner_last_name?.trim() || null;
  if (input.email !== undefined) out.email = input.email?.trim() || null;
  if (input.mobile_no !== undefined) out.mobile_no = input.mobile_no?.trim() || null;
  return out;
}

function isUniqueViolation(err: unknown, indexName: string): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { code?: string; constraint?: string; message?: string };
  if (e.code !== "23505") return false;
  if (e.constraint === indexName) return true;
  return typeof e.message === "string" && e.message.includes(indexName);
}
