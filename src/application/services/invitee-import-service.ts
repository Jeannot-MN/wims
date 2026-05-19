import { randomUUID } from "node:crypto";
import type { DataSource } from "typeorm";
import { ExcelInviteeParser, type ParsedRow } from "@/infrastructure/excel/excel-invitee-parser";
import { InviteeService } from "./invitee-service";
import { InviteeEntity } from "@/infrastructure/db/entities/Invitee";
import { RsvpEntity } from "@/infrastructure/db/entities/Rsvp";
import { EventEntity } from "@/infrastructure/db/entities/Event";
import { ForbiddenError, NotFoundError } from "./event-service";

export type ImportPreview = {
  previewId: string;
  eventId: string;
  rows: PreviewRow[];
};

export type PreviewRowStatus = "ok" | "warning" | "error" | "duplicate";

export type PreviewRow = ParsedRow & {
  status: PreviewRowStatus;
  reason: string | null;
  duplicateOf: { kind: "email" | "name"; value: string } | null;
};

type CacheEntry = {
  ownerId: string;
  eventId: string;
  rows: PreviewRow[];
  createdAt: number;
};

const PREVIEW_TTL_MS = 30 * 60 * 1000;

export class InviteeImportService {
  private static cache = new Map<string, CacheEntry>();

  constructor(
    private readonly dataSource: DataSource,
    private readonly parser: ExcelInviteeParser,
    private readonly invitees: InviteeService,
  ) {}

  async preview(ownerId: string, eventId: string, fileBytes: Uint8Array): Promise<ImportPreview> {
    await this.requireOwnedEvent(ownerId, eventId);
    const parsed = this.parser.parse(fileBytes);

    const existing = await this.dataSource.getRepository(InviteeEntity).find({
      where: { event_id: eventId },
    });
    const existingEmails = new Set(
      existing.map((e) => (e.email ?? "").toLowerCase()).filter((s) => s.length > 0),
    );
    const existingNames = new Set(
      existing.map((e) => `${e.primary_first_name}|${e.primary_last_name}`.toLowerCase()),
    );

    const seenInBatch = { email: new Set<string>(), name: new Set<string>() };

    const rows: PreviewRow[] = parsed.map((row) => {
      if (row.validation.kind === "error") {
        return { ...row, status: "error" as PreviewRowStatus, reason: row.validation.reason, duplicateOf: null };
      }
      const emailKey = (row.email ?? "").toLowerCase();
      const nameKey = `${row.primary_first_name}|${row.primary_last_name}`.toLowerCase();
      if (emailKey && (existingEmails.has(emailKey) || seenInBatch.email.has(emailKey))) {
        return { ...row, status: "duplicate", reason: "duplicate_email", duplicateOf: { kind: "email", value: emailKey } };
      }
      if (!emailKey && existingNames.has(nameKey)) {
        return { ...row, status: "duplicate", reason: "duplicate_name", duplicateOf: { kind: "name", value: nameKey } };
      }
      if (emailKey) seenInBatch.email.add(emailKey);
      seenInBatch.name.add(nameKey);
      if (row.validation.kind === "warning") {
        return { ...row, status: "warning", reason: row.validation.reason, duplicateOf: null };
      }
      return { ...row, status: "ok", reason: null, duplicateOf: null };
    });

    const previewId = randomUUID();
    this.cleanupExpired();
    InviteeImportService.cache.set(previewId, {
      ownerId,
      eventId,
      rows,
      createdAt: Date.now(),
    });
    return { previewId, eventId, rows };
  }

  async commit(ownerId: string, previewId: string, skipRowIndices: number[] = []): Promise<InviteeEntity[]> {
    const entry = InviteeImportService.cache.get(previewId);
    if (!entry) throw new NotFoundError("Preview not found or expired");
    if (entry.ownerId !== ownerId) throw new ForbiddenError();
    InviteeImportService.cache.delete(previewId);

    const skip = new Set(skipRowIndices);
    const eligible = entry.rows.filter(
      (r) => r.status !== "error" && !skip.has(r.rowIndex),
    );

    const created: InviteeEntity[] = [];
    await this.dataSource.transaction(async (mgr) => {
      for (const row of eligible) {
        const invitee = await this.invitees.createInviteeIn(mgr, entry.eventId, {
          primary_first_name: row.primary_first_name,
          primary_last_name: row.primary_last_name,
          partner_first_name: row.partner_first_name,
          partner_last_name: row.partner_last_name,
          email: row.email,
          mobile_no: row.mobile_no,
        });
        await mgr.save(mgr.create(RsvpEntity, { invitee_id: invitee.id }));
        created.push(invitee);
      }
    });
    return created;
  }

  private cleanupExpired(): void {
    const now = Date.now();
    for (const [id, entry] of InviteeImportService.cache.entries()) {
      if (now - entry.createdAt > PREVIEW_TTL_MS) {
        InviteeImportService.cache.delete(id);
      }
    }
  }

  private async requireOwnedEvent(ownerId: string, eventId: string): Promise<EventEntity> {
    const evt = await this.dataSource.getRepository(EventEntity).findOne({ where: { id: eventId } });
    if (!evt) throw new NotFoundError("Event not found");
    if (evt.owner_user_id !== ownerId) throw new ForbiddenError();
    return evt;
  }
}
