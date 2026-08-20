/**
 * An event start comfortably ahead of now, so the default RSVP deadline
 * (starts_at − 30 days, see RsvpDeadlinePolicy) is still open.
 *
 * Fixtures used to hardcode a literal date, which silently rotted once the
 * wall clock drifted inside that 30-day window — every submitRsvp started
 * failing with RSVP_CLOSED. Derive it from now instead.
 */
export function futureEventStart(): Date {
  const d = new Date();
  d.setUTCFullYear(d.getUTCFullYear() + 1);
  d.setUTCHours(15, 0, 0, 0);
  return d;
}
