import type { DataSource } from "typeorm";
import * as XLSX from "xlsx";
import { InviteeEntity } from "@/infrastructure/db/entities/Invitee";
import { RsvpEntity, type RsvpStatus } from "@/infrastructure/db/entities/Rsvp";
import { EventEntity } from "@/infrastructure/db/entities/Event";
import { ForbiddenError, NotFoundError } from "./event-service";

export type DashboardStats = {
  total: number;
  accepted: number;
  declined: number;
  maybe: number;
  pending: number;
};

export type InviteeListItem = {
  id: string;
  invite_token: string;
  primary_first_name: string;
  primary_last_name: string;
  partner_first_name: string | null;
  partner_last_name: string | null;
  email: string | null;
  mobile_no: string | null;
  is_couple: boolean;
  rsvp_status: RsvpStatus;
  dietary_restrictions: string;
  song_requests: string;
  accommodation_needed: boolean;
  submitted_at: Date | null;
};

export type InviteeListFilter = {
  status?: RsvpStatus | "all";
  search?: string;
  accommodation?: "yes" | "no";
  has_dietary?: boolean;
  sort?: "name" | "status" | "submitted_at" | "created_at";
  direction?: "asc" | "desc";
};

export class DashboardQueryService {
  constructor(private readonly dataSource: DataSource) {}

  async stats(ownerId: string, eventId: string): Promise<DashboardStats> {
    await this.requireOwnedEvent(ownerId, eventId);
    const rows = await this.dataSource
      .createQueryBuilder()
      .select("r.status", "status")
      .addSelect("COUNT(*)::int", "count")
      .from(RsvpEntity, "r")
      .innerJoin(InviteeEntity, "i", "i.id = r.invitee_id")
      .where("i.event_id = :eventId", { eventId })
      .groupBy("r.status")
      .getRawMany<{ status: RsvpStatus; count: number }>();
    const stats: DashboardStats = { total: 0, accepted: 0, declined: 0, maybe: 0, pending: 0 };
    for (const row of rows) {
      stats[row.status] = Number(row.count);
      stats.total += Number(row.count);
    }
    return stats;
  }

  async list(ownerId: string, eventId: string, filter: InviteeListFilter = {}): Promise<InviteeListItem[]> {
    await this.requireOwnedEvent(ownerId, eventId);
    const qb = this.dataSource
      .createQueryBuilder()
      .select("i")
      .addSelect("r")
      .from(InviteeEntity, "i")
      .leftJoin(RsvpEntity, "r", "r.invitee_id = i.id")
      .where("i.event_id = :eventId", { eventId });

    if (filter.status && filter.status !== "all") {
      qb.andWhere("r.status = :status", { status: filter.status });
    }
    if (filter.search) {
      qb.andWhere(
        "(LOWER(i.primary_first_name) LIKE :q OR LOWER(i.primary_last_name) LIKE :q OR LOWER(COALESCE(i.email, '')) LIKE :q)",
        { q: `%${filter.search.toLowerCase()}%` },
      );
    }
    if (filter.accommodation === "yes") {
      qb.andWhere("COALESCE(r.accommodation_needed, false) = true");
    }
    if (filter.accommodation === "no") {
      qb.andWhere("COALESCE(r.accommodation_needed, false) = false");
    }
    if (filter.has_dietary) {
      qb.andWhere("COALESCE(r.dietary_restrictions, '') <> ''");
    }
    const direction = (filter.direction ?? "asc").toUpperCase() as "ASC" | "DESC";
    switch (filter.sort) {
      case "status":
        qb.orderBy("r.status", direction).addOrderBy("i.primary_last_name", "ASC");
        break;
      case "submitted_at":
        qb.orderBy("r.submitted_at", direction, "NULLS LAST");
        break;
      case "created_at":
        qb.orderBy("i.created_at", direction);
        break;
      case "name":
      default:
        qb.orderBy("i.primary_last_name", direction).addOrderBy("i.primary_first_name", direction);
    }

    const raw = await qb.getRawMany<Record<string, unknown>>();
    return raw.map((row) => {
      return {
        id: String(row["i_id"]),
        invite_token: String(row["i_invite_token"]),
        primary_first_name: String(row["i_primary_first_name"] ?? ""),
        primary_last_name: String(row["i_primary_last_name"] ?? ""),
        partner_first_name: (row["i_partner_first_name"] as string | null) ?? null,
        partner_last_name: (row["i_partner_last_name"] as string | null) ?? null,
        email: (row["i_email"] as string | null) ?? null,
        mobile_no: (row["i_mobile_no"] as string | null) ?? null,
        is_couple: Boolean(row["i_partner_first_name"]),
        rsvp_status: ((row["r_status"] as RsvpStatus) ?? "pending") as RsvpStatus,
        dietary_restrictions: String(row["r_dietary_restrictions"] ?? ""),
        song_requests: String(row["r_song_requests"] ?? ""),
        accommodation_needed: Boolean(row["r_accommodation_needed"]),
        submitted_at: row["r_submitted_at"] ? new Date(String(row["r_submitted_at"])) : null,
      };
    });
  }

  async exportXlsx(
    ownerId: string,
    eventId: string,
    filter: InviteeListFilter = {},
  ): Promise<{ filename: string; base64: string }> {
    const items = await this.list(ownerId, eventId, filter);
    const rows = items.map((i) => ({
      first_name: i.primary_first_name,
      last_name: i.primary_last_name,
      partner_first_name: i.partner_first_name ?? "",
      partner_last_name: i.partner_last_name ?? "",
      email: i.email ?? "",
      mobile_no: i.mobile_no ?? "",
      status: i.rsvp_status,
      dietary_restrictions: i.dietary_restrictions,
      song_requests: i.song_requests,
      accommodation_needed: i.accommodation_needed ? "yes" : "no",
      submitted_at: i.submitted_at?.toISOString() ?? "",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "RSVPs");
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
    return {
      filename: `rsvps-${eventId.slice(0, 8)}.xlsx`,
      base64: buf.toString("base64"),
    };
  }

  private async requireOwnedEvent(ownerId: string, eventId: string): Promise<void> {
    const evt = await this.dataSource.getRepository(EventEntity).findOne({ where: { id: eventId } });
    if (!evt) throw new NotFoundError("Event not found");
    if (evt.owner_user_id !== ownerId) throw new ForbiddenError();
  }
}
