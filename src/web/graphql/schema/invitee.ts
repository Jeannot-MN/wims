import { GraphQLError } from "graphql";
import { builder } from "../builder";
import { wrap } from "../utils/errors";
import { requireAuth } from "../utils/require-auth";
import { InviteeService } from "@/application/services/invitee-service";
import { InviteTokenGenerator, nodeRandom } from "@/domain/invitee/invite-token-generator";
import { InviteeEntity } from "@/infrastructure/db/entities/Invitee";
import { ForbiddenError, NotFoundError } from "@/application/services/event-service";
import { ExcelInviteeParser } from "@/infrastructure/excel/excel-invitee-parser";
import { InviteeImportService, type PreviewRow } from "@/application/services/invitee-import-service";
import { WeddingInvitePdfRenderer } from "@/infrastructure/pdf/invite-pdf-renderer";
import { PdfService } from "@/application/services/pdf-service";

const tokens = new InviteTokenGenerator(nodeRandom);

function mapErr(err: unknown): never {
  if (err instanceof NotFoundError) {
    throw new GraphQLError(err.message, { extensions: { code: "NOT_FOUND" } });
  }
  if (err instanceof ForbiddenError) {
    throw new GraphQLError(err.message, { extensions: { code: "FORBIDDEN" } });
  }
  throw err;
}

export const Invitee = builder.objectRef<InviteeEntity>("Invitee").implement({
  fields: (t) => ({
    id: t.exposeID("id"),
    invite_token: t.exposeString("invite_token"),
    primary_first_name: t.exposeString("primary_first_name"),
    primary_last_name: t.exposeString("primary_last_name"),
    partner_first_name: t.exposeString("partner_first_name", { nullable: true }),
    partner_last_name: t.exposeString("partner_last_name", { nullable: true }),
    is_couple: t.boolean({ resolve: (i) => Boolean(i.partner_first_name) }),
    email: t.exposeString("email", { nullable: true }),
    mobile_no: t.exposeString("mobile_no", { nullable: true }),
    invite_url: t.string({
      resolve: (i) => `${process.env.APP_BASE_URL ?? ""}/invite/${i.invite_token}`,
    }),
  }),
});

const InviteeInput = builder.inputType("InviteeInput", {
  fields: (t) => ({
    primary_first_name: t.string({ required: true }),
    primary_last_name: t.string({ required: true }),
    partner_first_name: t.string({ required: false }),
    partner_last_name: t.string({ required: false }),
    email: t.string({ required: false }),
    mobile_no: t.string({ required: false }),
  }),
});

const InviteeUpdateInput = builder.inputType("InviteeUpdateInput", {
  fields: (t) => ({
    primary_first_name: t.string({ required: false }),
    primary_last_name: t.string({ required: false }),
    partner_first_name: t.string({ required: false }),
    partner_last_name: t.string({ required: false }),
    email: t.string({ required: false }),
    mobile_no: t.string({ required: false }),
  }),
});

builder.queryField("eventInvitees", (t) =>
  t.field({
    type: [Invitee],
    args: { eventId: t.arg.id({ required: true }) },
    resolve: (_root, args, ctx) =>
      wrap(async () => {
        const user = requireAuth(ctx);
        try {
          return await new InviteeService(ctx.dataSource, tokens).listForEvent(
            user.id,
            String(args.eventId),
          );
        } catch (err) {
          mapErr(err);
        }
      }),
  }),
);

builder.mutationField("addInvitee", (t) =>
  t.field({
    type: Invitee,
    args: {
      eventId: t.arg.id({ required: true }),
      input: t.arg({ type: InviteeInput, required: true }),
    },
    resolve: (_root, args, ctx) =>
      wrap(async () => {
        const user = requireAuth(ctx);
        try {
          return await new InviteeService(ctx.dataSource, tokens).add(
            user.id,
            String(args.eventId),
            {
              primary_first_name: args.input.primary_first_name,
              primary_last_name: args.input.primary_last_name,
              partner_first_name: args.input.partner_first_name ?? null,
              partner_last_name: args.input.partner_last_name ?? null,
              email: args.input.email ?? null,
              mobile_no: args.input.mobile_no ?? null,
            },
          );
        } catch (err) {
          mapErr(err);
        }
      }),
  }),
);

builder.mutationField("updateInvitee", (t) =>
  t.field({
    type: Invitee,
    args: {
      id: t.arg.id({ required: true }),
      input: t.arg({ type: InviteeUpdateInput, required: true }),
    },
    resolve: (_root, args, ctx) =>
      wrap(async () => {
        const user = requireAuth(ctx);
        try {
          const patch: Record<string, unknown> = {};
          for (const k of [
            "primary_first_name",
            "primary_last_name",
            "partner_first_name",
            "partner_last_name",
            "email",
            "mobile_no",
          ] as const) {
            const v = args.input[k];
            if (v !== undefined && v !== null) patch[k] = v;
          }
          return await new InviteeService(ctx.dataSource, tokens).update(user.id, String(args.id), patch);
        } catch (err) {
          mapErr(err);
        }
      }),
  }),
);

builder.mutationField("deleteInvitee", (t) =>
  t.field({
    type: "Boolean",
    args: { id: t.arg.id({ required: true }) },
    resolve: (_root, args, ctx) =>
      wrap(async () => {
        const user = requireAuth(ctx);
        try {
          await new InviteeService(ctx.dataSource, tokens).remove(user.id, String(args.id));
          return true;
        } catch (err) {
          mapErr(err);
        }
      }),
  }),
);

// ---------------- Excel import ----------------

const PreviewRowType = builder.objectRef<PreviewRow>("ImportPreviewRow").implement({
  fields: (t) => ({
    rowIndex: t.exposeInt("rowIndex"),
    status: t.string({ resolve: (r) => r.status }),
    reason: t.exposeString("reason", { nullable: true }),
    primary_first_name: t.exposeString("primary_first_name"),
    primary_last_name: t.exposeString("primary_last_name"),
    partner_first_name: t.exposeString("partner_first_name", { nullable: true }),
    partner_last_name: t.exposeString("partner_last_name", { nullable: true }),
    email: t.exposeString("email", { nullable: true }),
    mobile_no: t.exposeString("mobile_no", { nullable: true }),
  }),
});

const ImportPreviewType = builder
  .objectRef<{ previewId: string; eventId: string; rows: PreviewRow[] }>("ImportPreview")
  .implement({
    fields: (t) => ({
      previewId: t.exposeString("previewId"),
      eventId: t.exposeString("eventId"),
      rows: t.field({ type: [PreviewRowType], resolve: (p) => p.rows }),
    }),
  });

builder.mutationField("previewInviteeImport", (t) =>
  t.field({
    type: ImportPreviewType,
    args: {
      eventId: t.arg.id({ required: true }),
      fileBase64: t.arg.string({ required: true }),
    },
    resolve: (_root, args, ctx) =>
      wrap(async () => {
        const user = requireAuth(ctx);
        const parser = new ExcelInviteeParser();
        const service = new InviteeImportService(
          ctx.dataSource,
          parser,
          new InviteeService(ctx.dataSource, tokens),
        );
        const bytes = Buffer.from(args.fileBase64, "base64");
        try {
          return await service.preview(user.id, String(args.eventId), bytes);
        } catch (err) {
          mapErr(err);
        }
      }),
  }),
);

builder.mutationField("commitInviteeImport", (t) =>
  t.field({
    type: [Invitee],
    args: {
      previewId: t.arg.string({ required: true }),
      skipRowIndices: t.arg.intList({ required: false }),
    },
    resolve: (_root, args, ctx) =>
      wrap(async () => {
        const user = requireAuth(ctx);
        const service = new InviteeImportService(
          ctx.dataSource,
          new ExcelInviteeParser(),
          new InviteeService(ctx.dataSource, tokens),
        );
        try {
          return await service.commit(user.id, args.previewId, args.skipRowIndices ?? []);
        } catch (err) {
          mapErr(err);
        }
      }),
  }),
);

// ---------------- PDF ----------------

const InvitePdfPayload = builder
  .objectRef<{ filename: string; base64: string }>("InvitePdfPayload")
  .implement({
    fields: (t) => ({
      filename: t.exposeString("filename"),
      base64: t.exposeString("base64"),
    }),
  });

builder.queryField("inviteePdf", (t) =>
  t.field({
    type: InvitePdfPayload,
    args: { inviteeId: t.arg.id({ required: true }) },
    resolve: (_root, args, ctx) =>
      wrap(async () => {
        const user = requireAuth(ctx);
        const service = new PdfService(ctx.dataSource, new WeddingInvitePdfRenderer());
        try {
          const { buffer, filename } = await service.renderForOwner(user.id, String(args.inviteeId));
          return { filename, base64: buffer.toString("base64") };
        } catch (err) {
          mapErr(err);
        }
      }),
  }),
);
