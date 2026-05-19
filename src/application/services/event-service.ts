import type { DataSource } from "typeorm";
import { EventEntity, type ScheduleItem, type CustomSection } from "@/infrastructure/db/entities/Event";

export class NotFoundError extends Error {
  constructor(message = "Not found") {
    super(message);
  }
}

export class ForbiddenError extends Error {
  constructor(message = "Forbidden") {
    super(message);
  }
}

export type LocationInput = {
  place_id?: string | null;
  formatted_address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  address_text?: string | null;
};

export type EventInput = {
  title: string;
  description?: string;
  starts_at: Date;
  ends_at?: Date | null;
  rsvp_deadline_at?: Date | null;
  location?: LocationInput;
  dress_code?: string;
  gift_registry_url?: string;
  schedule?: ScheduleItem[];
  custom_sections?: CustomSection[];
  cover_image_url?: string;
};

function validateEventInput(input: EventInput): void {
  if (!input.title || input.title.trim().length === 0) {
    throw new Error("Title is required");
  }
  if (input.title.length > 255) {
    throw new Error("Title is too long");
  }
  if (!(input.starts_at instanceof Date) || Number.isNaN(input.starts_at.getTime())) {
    throw new Error("Valid start date is required");
  }
  if (input.ends_at && input.ends_at.getTime() < input.starts_at.getTime()) {
    throw new Error("End date must be after start date");
  }
  if (
    input.rsvp_deadline_at &&
    input.rsvp_deadline_at.getTime() > input.starts_at.getTime()
  ) {
    throw new Error("RSVP deadline must be before the event start");
  }
}

export class EventService {
  constructor(private readonly dataSource: DataSource) {}

  private repo() {
    return this.dataSource.getRepository(EventEntity);
  }

  async create(ownerId: string, input: EventInput): Promise<EventEntity> {
    validateEventInput(input);
    const entity = this.repo().create({
      owner_user_id: ownerId,
      event_type: "wedding",
      title: input.title.trim(),
      description: input.description ?? "",
      starts_at: input.starts_at,
      ends_at: input.ends_at ?? null,
      rsvp_deadline_at: input.rsvp_deadline_at ?? null,
      address_text: input.location?.address_text ?? "",
      place_id: input.location?.place_id ?? null,
      formatted_address: input.location?.formatted_address ?? null,
      latitude: input.location?.latitude ?? null,
      longitude: input.location?.longitude ?? null,
      dress_code: input.dress_code ?? "",
      gift_registry_url: input.gift_registry_url ?? "",
      schedule: input.schedule ?? [],
      custom_sections: input.custom_sections ?? [],
      cover_image_url: input.cover_image_url ?? "",
    });
    return await this.repo().save(entity);
  }

  async update(
    ownerId: string,
    id: string,
    input: Partial<EventInput>,
  ): Promise<EventEntity> {
    const event = await this.requireOwned(ownerId, id);
    if (input.title !== undefined) event.title = input.title.trim();
    if (input.description !== undefined) event.description = input.description;
    if (input.starts_at !== undefined) event.starts_at = input.starts_at;
    if (input.ends_at !== undefined) event.ends_at = input.ends_at;
    if (input.rsvp_deadline_at !== undefined) event.rsvp_deadline_at = input.rsvp_deadline_at;
    if (input.location !== undefined) {
      event.address_text = input.location.address_text ?? event.address_text;
      event.place_id = input.location.place_id ?? event.place_id;
      event.formatted_address = input.location.formatted_address ?? event.formatted_address;
      event.latitude = input.location.latitude ?? event.latitude;
      event.longitude = input.location.longitude ?? event.longitude;
    }
    if (input.dress_code !== undefined) event.dress_code = input.dress_code;
    if (input.gift_registry_url !== undefined) event.gift_registry_url = input.gift_registry_url;
    if (input.schedule !== undefined) event.schedule = input.schedule;
    if (input.custom_sections !== undefined) event.custom_sections = input.custom_sections;
    if (input.cover_image_url !== undefined) event.cover_image_url = input.cover_image_url;
    validateEventInput({
      title: event.title,
      starts_at: event.starts_at,
      ends_at: event.ends_at,
      rsvp_deadline_at: event.rsvp_deadline_at,
    });
    return await this.repo().save(event);
  }

  async delete(ownerId: string, id: string): Promise<void> {
    await this.requireOwned(ownerId, id);
    await this.repo().delete({ id });
  }

  async list(ownerId: string): Promise<EventEntity[]> {
    return await this.repo().find({
      where: { owner_user_id: ownerId },
      order: { starts_at: "DESC" },
    });
  }

  async get(ownerId: string, id: string): Promise<EventEntity> {
    return await this.requireOwned(ownerId, id);
  }

  private async requireOwned(ownerId: string, id: string): Promise<EventEntity> {
    const event = await this.repo().findOne({ where: { id } });
    if (!event) throw new NotFoundError("Event not found");
    if (event.owner_user_id !== ownerId) throw new ForbiddenError();
    return event;
  }
}
