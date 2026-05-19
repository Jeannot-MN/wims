import { GraphQLError } from "graphql";
import { builder } from "../builder";
import { wrap } from "../utils/errors";
import { requireAuth } from "../utils/require-auth";
import {
  DashboardQueryService,
  type DashboardStats,
  type InviteeListItem,
} from "@/application/services/dashboard-query-service";
import { ForbiddenError, NotFoundError } from "@/application/services/event-service";

function mapErr(err: unknown): never {
  if (err instanceof NotFoundError) {
    throw new GraphQLError(err.message, { extensions: { code: "NOT_FOUND" } });
  }
  if (err instanceof ForbiddenError) {
    throw new GraphQLError(err.message, { extensions: { code: "FORBIDDEN" } });
  }
  throw err;
}

const Stats = builder.objectRef<DashboardStats>("EventDashboardStats").implement({
  fields: (t) => ({
    total: t.exposeInt("total"),
    accepted: t.exposeInt("accepted"),
    declined: t.exposeInt("declined"),
    maybe: t.exposeInt("maybe"),
    pending: t.exposeInt("pending"),
  }),
});

const InviteeListItemType = builder.objectRef<InviteeListItem>("InviteeListItem").implement({
  fields: (t) => ({
    id: t.exposeID("id"),
    invite_token: t.exposeString("invite_token"),
    primary_first_name: t.exposeString("primary_first_name"),
    primary_last_name: t.exposeString("primary_last_name"),
    partner_first_name: t.exposeString("partner_first_name", { nullable: true }),
    partner_last_name: t.exposeString("partner_last_name", { nullable: true }),
    is_couple: t.exposeBoolean("is_couple"),
    email: t.exposeString("email", { nullable: true }),
    mobile_no: t.exposeString("mobile_no", { nullable: true }),
    rsvp_status: t.string({ resolve: (i) => i.rsvp_status }),
    dietary_restrictions: t.exposeString("dietary_restrictions"),
    song_requests: t.exposeString("song_requests"),
    accommodation_needed: t.exposeBoolean("accommodation_needed"),
    submitted_at: t.field({
      type: "DateTime",
      nullable: true,
      resolve: (i) => i.submitted_at,
    }),
    invite_url: t.string({
      resolve: (i) => `${process.env.APP_BASE_URL ?? ""}/invite/${i.invite_token}`,
    }),
  }),
});

const ExportPayload = builder
  .objectRef<{ filename: string; base64: string }>("ExportPayload")
  .implement({
    fields: (t) => ({
      filename: t.exposeString("filename"),
      base64: t.exposeString("base64"),
    }),
  });

builder.queryField("eventDashboardStats", (t) =>
  t.field({
    type: Stats,
    args: { eventId: t.arg.id({ required: true }) },
    resolve: (_root, args, ctx) =>
      wrap(async () => {
        const user = requireAuth(ctx);
        try {
          return await new DashboardQueryService(ctx.dataSource).stats(user.id, String(args.eventId));
        } catch (err) {
          mapErr(err);
        }
      }),
  }),
);

builder.queryField("eventInviteesList", (t) =>
  t.field({
    type: [InviteeListItemType],
    args: {
      eventId: t.arg.id({ required: true }),
      status: t.arg.string({ required: false }),
      search: t.arg.string({ required: false }),
      sort: t.arg.string({ required: false }),
      direction: t.arg.string({ required: false }),
    },
    resolve: (_root, args, ctx) =>
      wrap(async () => {
        const user = requireAuth(ctx);
        try {
          return await new DashboardQueryService(ctx.dataSource).list(user.id, String(args.eventId), {
            status: args.status as "all" | undefined,
            search: args.search ?? undefined,
            sort: args.sort as "name" | undefined,
            direction: args.direction as "asc" | "desc" | undefined,
          });
        } catch (err) {
          mapErr(err);
        }
      }),
  }),
);

builder.mutationField("exportInvitees", (t) =>
  t.field({
    type: ExportPayload,
    args: { eventId: t.arg.id({ required: true }) },
    resolve: (_root, args, ctx) =>
      wrap(async () => {
        const user = requireAuth(ctx);
        try {
          return await new DashboardQueryService(ctx.dataSource).exportXlsx(user.id, String(args.eventId));
        } catch (err) {
          mapErr(err);
        }
      }),
  }),
);
