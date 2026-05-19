import { GraphQLError } from "graphql";
import { builder } from "../builder";
import { wrap } from "../utils/errors";
import { SystemClock } from "@/application/ports/clock";
import { RsvpService, RsvpClosedError, InvalidTokenError, type InviteView } from "@/application/services/rsvp-service";
import type { EventEntity } from "@/infrastructure/db/entities/Event";
import type { InviteeEntity } from "@/infrastructure/db/entities/Invitee";
import type { RsvpEntity } from "@/infrastructure/db/entities/Rsvp";
import { RsvpDeadlinePolicy } from "@/domain/event/rsvp-deadline-policy";

const clock = new SystemClock();
const deadlinePolicy = new RsvpDeadlinePolicy();

const PublicLocation = builder
  .objectRef<{
    formatted_address: string | null;
    latitude: number | null;
    longitude: number | null;
    address_text: string;
  }>("PublicLocation")
  .implement({
    fields: (t) => ({
      formatted_address: t.exposeString("formatted_address", { nullable: true }),
      address_text: t.exposeString("address_text"),
      latitude: t.exposeFloat("latitude", { nullable: true }),
      longitude: t.exposeFloat("longitude", { nullable: true }),
      maps_url: t.string({
        resolve: (l) => {
          if (l.latitude && l.longitude) {
            return `https://www.google.com/maps/search/?api=1&query=${l.latitude},${l.longitude}`;
          }
          const addr = l.formatted_address ?? l.address_text;
          return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`;
        },
      }),
    }),
  });

const PublicScheduleItem = builder
  .objectRef<{ time: string; title: string; description: string }>("PublicScheduleItem")
  .implement({
    fields: (t) => ({
      time: t.exposeString("time"),
      title: t.exposeString("title"),
      description: t.exposeString("description"),
    }),
  });

const PublicCustomSection = builder
  .objectRef<{ heading: string; body: string }>("PublicCustomSection")
  .implement({
    fields: (t) => ({
      heading: t.exposeString("heading"),
      body: t.exposeString("body"),
    }),
  });

const PublicEvent = builder.objectRef<EventEntity>("PublicEvent").implement({
  fields: (t) => ({
    title: t.exposeString("title"),
    description: t.exposeString("description"),
    starts_at: t.field({ type: "DateTime", resolve: (e) => e.starts_at }),
    ends_at: t.field({ type: "DateTime", nullable: true, resolve: (e) => e.ends_at }),
    location: t.field({
      type: PublicLocation,
      resolve: (e) => ({
        formatted_address: e.formatted_address,
        latitude: e.latitude,
        longitude: e.longitude,
        address_text: e.address_text,
      }),
    }),
    dress_code: t.exposeString("dress_code"),
    gift_registry_url: t.exposeString("gift_registry_url"),
    schedule: t.field({ type: [PublicScheduleItem], resolve: (e) => e.schedule ?? [] }),
    custom_sections: t.field({
      type: [PublicCustomSection],
      resolve: (e) => e.custom_sections ?? [],
    }),
    cover_image_url: t.exposeString("cover_image_url"),
    rsvp_deadline_at: t.field({ type: "DateTime", resolve: (e) => deadlinePolicy.effective(e) }),
  }),
});

const PublicInvitee = builder.objectRef<InviteeEntity>("PublicInvitee").implement({
  fields: (t) => ({
    primary_first_name: t.exposeString("primary_first_name"),
    primary_last_name: t.exposeString("primary_last_name"),
    partner_first_name: t.exposeString("partner_first_name", { nullable: true }),
    partner_last_name: t.exposeString("partner_last_name", { nullable: true }),
    is_couple: t.boolean({ resolve: (i) => Boolean(i.partner_first_name) }),
  }),
});

const PublicRsvp = builder.objectRef<RsvpEntity>("PublicRsvp").implement({
  fields: (t) => ({
    status: t.exposeString("status"),
    dietary_restrictions: t.exposeString("dietary_restrictions"),
    song_requests: t.exposeString("song_requests"),
    accommodation_needed: t.exposeBoolean("accommodation_needed"),
    submitted_at: t.field({ type: "DateTime", nullable: true, resolve: (r) => r.submitted_at }),
  }),
});

const InviteView = builder.objectRef<InviteView>("InviteView").implement({
  fields: (t) => ({
    event: t.field({ type: PublicEvent, resolve: (v) => v.event }),
    invitee: t.field({ type: PublicInvitee, resolve: (v) => v.invitee }),
    rsvp: t.field({ type: PublicRsvp, resolve: (v) => v.rsvp }),
    is_rsvp_closed: t.exposeBoolean("is_rsvp_closed"),
    deadline: t.field({ type: "DateTime", resolve: (v) => v.deadline }),
  }),
});

const SubmitRsvpInput = builder.inputType("SubmitRsvpInput", {
  fields: (t) => ({
    status: t.string({ required: true }),
    dietary_restrictions: t.string({ required: false }),
    song_requests: t.string({ required: false }),
    accommodation_needed: t.boolean({ required: false }),
    partner_first_name: t.string({ required: false }),
    partner_last_name: t.string({ required: false }),
  }),
});

builder.queryField("invite", (t) =>
  t.field({
    type: InviteView,
    nullable: true,
    args: { token: t.arg.string({ required: true }) },
    resolve: (_root, args, ctx) =>
      wrap(async () => {
        const service = new RsvpService(ctx.dataSource, clock, ctx.email);
        return await service.getByToken(args.token);
      }),
  }),
);

builder.mutationField("submitRsvp", (t) =>
  t.field({
    type: InviteView,
    args: {
      token: t.arg.string({ required: true }),
      input: t.arg({ type: SubmitRsvpInput, required: true }),
    },
    resolve: (_root, args, ctx) =>
      wrap(async () => {
        const service = new RsvpService(ctx.dataSource, clock, ctx.email);
        const status = args.input.status;
        if (status !== "accepted" && status !== "declined" && status !== "maybe") {
          throw new GraphQLError("Invalid RSVP status", { extensions: { code: "INVALID_STATUS" } });
        }
        try {
          return await service.submit(
            args.token,
            {
              status,
              dietary_restrictions: args.input.dietary_restrictions ?? undefined,
              song_requests: args.input.song_requests ?? undefined,
              accommodation_needed: args.input.accommodation_needed ?? undefined,
              partner_first_name: args.input.partner_first_name ?? undefined,
              partner_last_name: args.input.partner_last_name ?? undefined,
            },
            ctx.requestIp,
          );
        } catch (err) {
          if (err instanceof RsvpClosedError) {
            throw new GraphQLError(err.message, { extensions: { code: "RSVP_CLOSED" } });
          }
          if (err instanceof InvalidTokenError) {
            throw new GraphQLError(err.message, { extensions: { code: "NOT_FOUND" } });
          }
          throw err;
        }
      }),
  }),
);
