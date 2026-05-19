import { GraphQLError } from "graphql";
import { builder } from "../builder";
import { wrap } from "../utils/errors";
import { requireAuth } from "../utils/require-auth";
import { EventService, NotFoundError, ForbiddenError } from "@/application/services/event-service";
import { EventEntity } from "@/infrastructure/db/entities/Event";
import { RsvpDeadlinePolicy } from "@/domain/event/rsvp-deadline-policy";

const deadlinePolicy = new RsvpDeadlinePolicy();

const ScheduleItem = builder
  .objectRef<{ time: string; title: string; description: string }>("ScheduleItem")
  .implement({
    fields: (t) => ({
      time: t.exposeString("time"),
      title: t.exposeString("title"),
      description: t.exposeString("description"),
    }),
  });

const CustomSection = builder
  .objectRef<{ heading: string; body: string }>("CustomSection")
  .implement({
    fields: (t) => ({
      heading: t.exposeString("heading"),
      body: t.exposeString("body"),
    }),
  });

const ScheduleItemInput = builder.inputType("ScheduleItemInput", {
  fields: (t) => ({
    time: t.string({ required: true }),
    title: t.string({ required: true }),
    description: t.string({ required: true }),
  }),
});

const CustomSectionInput = builder.inputType("CustomSectionInput", {
  fields: (t) => ({
    heading: t.string({ required: true }),
    body: t.string({ required: true }),
  }),
});

const LocationInput = builder.inputType("LocationInput", {
  fields: (t) => ({
    place_id: t.string({ required: false }),
    formatted_address: t.string({ required: false }),
    latitude: t.float({ required: false }),
    longitude: t.float({ required: false }),
    address_text: t.string({ required: false }),
  }),
});

const Location = builder
  .objectRef<{
    place_id: string | null;
    formatted_address: string | null;
    latitude: number | null;
    longitude: number | null;
    address_text: string;
  }>("Location")
  .implement({
    fields: (t) => ({
      place_id: t.exposeString("place_id", { nullable: true }),
      formatted_address: t.exposeString("formatted_address", { nullable: true }),
      latitude: t.exposeFloat("latitude", { nullable: true }),
      longitude: t.exposeFloat("longitude", { nullable: true }),
      address_text: t.exposeString("address_text"),
    }),
  });

export const Event = builder.objectRef<EventEntity>("Event").implement({
  fields: (t) => ({
    id: t.exposeID("id"),
    title: t.exposeString("title"),
    description: t.exposeString("description"),
    starts_at: t.field({ type: "DateTime", resolve: (e) => e.starts_at }),
    ends_at: t.field({
      type: "DateTime",
      nullable: true,
      resolve: (e) => e.ends_at,
    }),
    rsvp_deadline_at: t.field({
      type: "DateTime",
      resolve: (e) => deadlinePolicy.effective(e),
    }),
    is_rsvp_closed: t.boolean({
      resolve: (e) => deadlinePolicy.isClosed(e, new Date()),
    }),
    location: t.field({
      type: Location,
      resolve: (e) => ({
        place_id: e.place_id,
        formatted_address: e.formatted_address,
        latitude: e.latitude,
        longitude: e.longitude,
        address_text: e.address_text,
      }),
    }),
    dress_code: t.exposeString("dress_code"),
    gift_registry_url: t.exposeString("gift_registry_url"),
    schedule: t.field({ type: [ScheduleItem], resolve: (e) => e.schedule ?? [] }),
    custom_sections: t.field({
      type: [CustomSection],
      resolve: (e) => e.custom_sections ?? [],
    }),
    cover_image_url: t.exposeString("cover_image_url"),
    created_at: t.field({ type: "DateTime", resolve: (e) => e.created_at }),
    updated_at: t.field({ type: "DateTime", resolve: (e) => e.updated_at }),
  }),
});

const EventCreateInput = builder.inputType("EventCreateInput", {
  fields: (t) => ({
    title: t.string({ required: true }),
    description: t.string({ required: false }),
    starts_at: t.field({ type: "DateTime", required: true }),
    ends_at: t.field({ type: "DateTime", required: false }),
    rsvp_deadline_at: t.field({ type: "DateTime", required: false }),
    location: t.field({ type: LocationInput, required: false }),
    dress_code: t.string({ required: false }),
    gift_registry_url: t.string({ required: false }),
    schedule: t.field({ type: [ScheduleItemInput], required: false }),
    custom_sections: t.field({ type: [CustomSectionInput], required: false }),
    cover_image_url: t.string({ required: false }),
  }),
});

const EventUpdateInput = builder.inputType("EventUpdateInput", {
  fields: (t) => ({
    title: t.string({ required: false }),
    description: t.string({ required: false }),
    starts_at: t.field({ type: "DateTime", required: false }),
    ends_at: t.field({ type: "DateTime", required: false }),
    rsvp_deadline_at: t.field({ type: "DateTime", required: false }),
    location: t.field({ type: LocationInput, required: false }),
    dress_code: t.string({ required: false }),
    gift_registry_url: t.string({ required: false }),
    schedule: t.field({ type: [ScheduleItemInput], required: false }),
    custom_sections: t.field({ type: [CustomSectionInput], required: false }),
    cover_image_url: t.string({ required: false }),
  }),
});

function mapErr(err: unknown): never {
  if (err instanceof NotFoundError) {
    throw new GraphQLError(err.message, { extensions: { code: "NOT_FOUND" } });
  }
  if (err instanceof ForbiddenError) {
    throw new GraphQLError(err.message, { extensions: { code: "FORBIDDEN" } });
  }
  throw err;
}

builder.queryField("events", (t) =>
  t.field({
    type: [Event],
    resolve: (_root, _args, ctx) =>
      wrap(async () => {
        const user = requireAuth(ctx);
        const svc = new EventService(ctx.dataSource);
        return await svc.list(user.id);
      }),
  }),
);

builder.queryField("event", (t) =>
  t.field({
    type: Event,
    args: { id: t.arg.id({ required: true }) },
    resolve: (_root, args, ctx) =>
      wrap(async () => {
        const user = requireAuth(ctx);
        try {
          return await new EventService(ctx.dataSource).get(user.id, String(args.id));
        } catch (err) {
          mapErr(err);
        }
      }),
  }),
);

builder.mutationField("createEvent", (t) =>
  t.field({
    type: Event,
    args: { input: t.arg({ type: EventCreateInput, required: true }) },
    resolve: (_root, args, ctx) =>
      wrap(async () => {
        const user = requireAuth(ctx);
        const svc = new EventService(ctx.dataSource);
        return await svc.create(user.id, {
          title: args.input.title,
          description: args.input.description ?? undefined,
          starts_at: args.input.starts_at,
          ends_at: args.input.ends_at ?? null,
          rsvp_deadline_at: args.input.rsvp_deadline_at ?? null,
          location: args.input.location ?? undefined,
          dress_code: args.input.dress_code ?? undefined,
          gift_registry_url: args.input.gift_registry_url ?? undefined,
          schedule: args.input.schedule ?? undefined,
          custom_sections: args.input.custom_sections ?? undefined,
          cover_image_url: args.input.cover_image_url ?? undefined,
        });
      }),
  }),
);

builder.mutationField("updateEvent", (t) =>
  t.field({
    type: Event,
    args: {
      id: t.arg.id({ required: true }),
      input: t.arg({ type: EventUpdateInput, required: true }),
    },
    resolve: (_root, args, ctx) =>
      wrap(async () => {
        const user = requireAuth(ctx);
        try {
          return await new EventService(ctx.dataSource).update(user.id, String(args.id), {
            ...(args.input.title !== undefined && args.input.title !== null
              ? { title: args.input.title }
              : {}),
            ...(args.input.description !== undefined && args.input.description !== null
              ? { description: args.input.description }
              : {}),
            ...(args.input.starts_at !== undefined && args.input.starts_at !== null
              ? { starts_at: args.input.starts_at }
              : {}),
            ...(args.input.ends_at !== undefined ? { ends_at: args.input.ends_at } : {}),
            ...(args.input.rsvp_deadline_at !== undefined
              ? { rsvp_deadline_at: args.input.rsvp_deadline_at }
              : {}),
            ...(args.input.location !== undefined && args.input.location !== null
              ? { location: args.input.location }
              : {}),
            ...(args.input.dress_code !== undefined && args.input.dress_code !== null
              ? { dress_code: args.input.dress_code }
              : {}),
            ...(args.input.gift_registry_url !== undefined && args.input.gift_registry_url !== null
              ? { gift_registry_url: args.input.gift_registry_url }
              : {}),
            ...(args.input.schedule !== undefined && args.input.schedule !== null
              ? { schedule: args.input.schedule }
              : {}),
            ...(args.input.custom_sections !== undefined && args.input.custom_sections !== null
              ? { custom_sections: args.input.custom_sections }
              : {}),
            ...(args.input.cover_image_url !== undefined && args.input.cover_image_url !== null
              ? { cover_image_url: args.input.cover_image_url }
              : {}),
          });
        } catch (err) {
          mapErr(err);
        }
      }),
  }),
);

builder.mutationField("deleteEvent", (t) =>
  t.field({
    type: "Boolean",
    args: { id: t.arg.id({ required: true }) },
    resolve: (_root, args, ctx) =>
      wrap(async () => {
        const user = requireAuth(ctx);
        try {
          await new EventService(ctx.dataSource).delete(user.id, String(args.id));
          return true;
        } catch (err) {
          mapErr(err);
        }
      }),
  }),
);
