import type { DataSource } from "typeorm";
import { InviteeEntity } from "@/infrastructure/db/entities/Invitee";
import { EventEntity } from "@/infrastructure/db/entities/Event";
import { RsvpEntity, type RsvpStatus } from "@/infrastructure/db/entities/Rsvp";
import { RsvpStateMachine } from "@/domain/rsvp/rsvp-state-machine";
import { RsvpDeadlinePolicy } from "@/domain/event/rsvp-deadline-policy";
import type { EmailService } from "@/application/ports/email-service";
import type { Clock } from "@/application/ports/clock";

export class RsvpClosedError extends Error {
  constructor() {
    super("RSVP submissions are closed for this event");
  }
}

export class InvalidTokenError extends Error {
  constructor() {
    super("Invitation not found");
  }
}

export type InviteView = {
  event: EventEntity;
  invitee: InviteeEntity;
  rsvp: RsvpEntity;
  is_rsvp_closed: boolean;
  deadline: Date;
};

export type SubmitInput = {
  status: Exclude<RsvpStatus, "pending">;
  dietary_restrictions?: string;
  song_requests?: string;
  accommodation_needed?: boolean;
  partner_first_name?: string | null;
  partner_last_name?: string | null;
};

const RATE_LIMIT_PER_MIN = 10;
const rateBuckets = new Map<string, number[]>();

export class RsvpService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly clock: Clock,
    private readonly email: EmailService,
    private readonly stateMachine = new RsvpStateMachine(),
    private readonly deadlinePolicy = new RsvpDeadlinePolicy(),
  ) {}

  async getByToken(token: string): Promise<InviteView | null> {
    const invitee = await this.dataSource.getRepository(InviteeEntity).findOne({
      where: { invite_token: token },
    });
    if (!invitee) return null;
    const event = await this.dataSource.getRepository(EventEntity).findOne({
      where: { id: invitee.event_id },
    });
    if (!event) return null;
    let rsvp = await this.dataSource.getRepository(RsvpEntity).findOne({
      where: { invitee_id: invitee.id },
    });
    if (!rsvp) {
      const repo = this.dataSource.getRepository(RsvpEntity);
      rsvp = await repo.save(repo.create({ invitee_id: invitee.id }));
    }
    const deadline = this.deadlinePolicy.effective(event);
    return {
      event,
      invitee,
      rsvp,
      deadline,
      is_rsvp_closed: this.deadlinePolicy.isClosed(event, this.clock.now()),
    };
  }

  async submit(token: string, input: SubmitInput, requestKey: string): Promise<InviteView> {
    if (!this.checkRateLimit(`${token}:${requestKey}`)) {
      throw new Error("Too many submissions — try again in a minute");
    }
    const view = await this.getByToken(token);
    if (!view) throw new InvalidTokenError();

    const result = this.stateMachine.apply(
      {
        currentStatus: view.rsvp.status,
        deadline: view.deadline,
        now: this.clock.now(),
      },
      { type: "submit", status: input.status },
    );
    if (!result.ok) {
      if (result.reason === "deadline_passed") throw new RsvpClosedError();
      throw new Error("Invalid RSVP submission");
    }

    const rsvpRepo = this.dataSource.getRepository(RsvpEntity);
    view.rsvp.status = result.next;
    if (input.dietary_restrictions !== undefined) view.rsvp.dietary_restrictions = input.dietary_restrictions;
    if (input.song_requests !== undefined) view.rsvp.song_requests = input.song_requests;
    if (input.accommodation_needed !== undefined) view.rsvp.accommodation_needed = input.accommodation_needed;
    view.rsvp.submitted_at = this.clock.now();
    await rsvpRepo.save(view.rsvp);

    if (input.partner_first_name !== undefined || input.partner_last_name !== undefined) {
      const inviteeRepo = this.dataSource.getRepository(InviteeEntity);
      if (input.partner_first_name !== undefined) {
        view.invitee.partner_first_name = input.partner_first_name?.trim() || null;
      }
      if (input.partner_last_name !== undefined) {
        view.invitee.partner_last_name = input.partner_last_name?.trim() || null;
      }
      await inviteeRepo.save(view.invitee);
    }

    if (view.invitee.email) {
      await this.email.sendRsvpConfirmationEmail({
        to: view.invitee.email,
        eventTitle: view.event.title,
        status: view.rsvp.status,
      });
    }

    return view;
  }

  private checkRateLimit(key: string): boolean {
    const now = this.clock.now().getTime();
    const cutoff = now - 60_000;
    const arr = rateBuckets.get(key) ?? [];
    const filtered = arr.filter((t) => t > cutoff);
    if (filtered.length >= RATE_LIMIT_PER_MIN) return false;
    filtered.push(now);
    rateBuckets.set(key, filtered);
    return true;
  }
}

export function resetRsvpRateLimit(): void {
  rateBuckets.clear();
}
