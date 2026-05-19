const DEFAULT_OFFSET_DAYS = 30;

export class RsvpDeadlinePolicy {
  constructor(private readonly offsetDays = DEFAULT_OFFSET_DAYS) {}

  effective(event: { starts_at: Date; rsvp_deadline_at: Date | null }): Date {
    if (event.rsvp_deadline_at) return event.rsvp_deadline_at;
    const d = new Date(event.starts_at);
    d.setUTCDate(d.getUTCDate() - this.offsetDays);
    return d;
  }

  isClosed(event: { starts_at: Date; rsvp_deadline_at: Date | null }, now: Date): boolean {
    return now.getTime() > this.effective(event).getTime();
  }
}
