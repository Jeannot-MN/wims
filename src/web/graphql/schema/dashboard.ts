import { GraphQLError } from "graphql";
import { builder } from "../builder";
import { wrap } from "../utils/errors";
import { requireAuth } from "../utils/require-auth";
import {
  DashboardQueryService,
  type DashboardStats,
  type InviteeListFilter,
  type InviteeListItem,
} from "@/application/services/dashboard-query-service";
import type { RsvpStatus } from "@/infrastructure/db/entities/Rsvp";
import { ForbiddenError, NotFoundError } from "@/application/services/event-service";

const STATUSES = ["all", "pending", "accepted", "declined", "maybe"] as const;
const ACCOMMODATIONS = ["yes", "no"] as const;

function badInput(message: string): never {
  throw new GraphQLError(message, { extensions: { code: "BAD_INPUT" } });
}

type FilterArgs = {
  status?: string | null;
  search?: string | null;
  accommodation?: string | null;
  hasDietary?: boolean | null;
};

/**
 * Shared by eventInviteesList and exportInvitees so the export always narrows to
 * exactly what the host is looking at. Unknown values fail loudly — silently
 * returning zero rows is indistinguishable from "nobody matched".
 */
function parseFilter(args: FilterArgs): InviteeListFilter {
  const { status, accommodation } = args;
  if (status != null && !STATUSES.includes(status as (typeof STATUSES)[number])) {
    badInput(`Unknown status "${status}"`);
  }
  if (accommodation != null && !ACCOMMODATIONS.includes(accommodation as (typeof ACCOMMODATIONS)[number])) {
    badInput(`Unknown accommodation filter "${accommodation}"`);
  }
  return {
    status: (status as RsvpStatus | "all" | null) ?? undefined,
    search: args.search ?? undefined,
    accommodation: (accommodation as "yes" | "no" | null) ?? undefined,
    has_dietary: args.hasDietary ?? undefined,
  };
}

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
      accommodation: t.arg.string({ required: false }),
      hasDietary: t.arg.boolean({ required: false }),
      sort: t.arg.string({ required: false }),
      direction: t.arg.string({ required: false }),
    },
    resolve: (_root, args, ctx) =>
      wrap(async () => {
        const user = requireAuth(ctx);
        try {
          return await new DashboardQueryService(ctx.dataSource).list(user.id, String(args.eventId), {
            ...parseFilter(args),
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
    args: {
      eventId: t.arg.id({ required: true }),
      status: t.arg.string({ required: false }),
      search: t.arg.string({ required: false }),
      accommodation: t.arg.string({ required: false }),
      hasDietary: t.arg.boolean({ required: false }),
    },
    resolve: (_root, args, ctx) =>
      wrap(async () => {
        const user = requireAuth(ctx);
        try {
          return await new DashboardQueryService(ctx.dataSource).exportXlsx(
            user.id,
            String(args.eventId),
            parseFilter(args),
          );
        } catch (err) {
          mapErr(err);
        }
      }),
  }),
);
