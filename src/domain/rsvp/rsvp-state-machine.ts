export type RsvpStatus = "pending" | "accepted" | "declined" | "maybe";

export type RsvpAction =
  | { type: "submit"; status: Exclude<RsvpStatus, "pending"> };

export type Context = {
  currentStatus: RsvpStatus;
  deadline: Date;
  now: Date;
};

export type Transition =
  | { ok: true; next: RsvpStatus }
  | { ok: false; reason: "deadline_passed" | "invalid_transition" };

export class RsvpStateMachine {
  apply(ctx: Context, action: RsvpAction): Transition {
    if (ctx.now.getTime() > ctx.deadline.getTime()) {
      return { ok: false, reason: "deadline_passed" };
    }
    if (action.type === "submit") {
      const next = action.status;
      if (!["accepted", "declined", "maybe"].includes(next)) {
        return { ok: false, reason: "invalid_transition" };
      }
      return { ok: true, next };
    }
    return { ok: false, reason: "invalid_transition" };
  }
}
