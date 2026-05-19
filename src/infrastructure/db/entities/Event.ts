import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from "typeorm";

export type EventType = "wedding";

export type ScheduleItem = {
  time: string;
  title: string;
  description: string;
};

export type CustomSection = {
  heading: string;
  body: string;
};

@Entity({ name: "events" })
export class EventEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({ type: "uuid" })
  owner_user_id!: string;

  @Column({ type: "varchar", length: 32, default: "wedding" })
  event_type!: EventType;

  @Column({ type: "varchar", length: 255 })
  title!: string;

  @Column({ type: "text", default: "" })
  description!: string;

  @Column({ type: "timestamptz" })
  starts_at!: Date;

  @Column({ type: "timestamptz", nullable: true })
  ends_at!: Date | null;

  @Column({ type: "text", default: "" })
  address_text!: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  place_id!: string | null;

  @Column({ type: "text", nullable: true })
  formatted_address!: string | null;

  @Column({ type: "double precision", nullable: true })
  latitude!: number | null;

  @Column({ type: "double precision", nullable: true })
  longitude!: number | null;

  @Column({ type: "timestamptz", nullable: true })
  rsvp_deadline_at!: Date | null;

  @Column({ type: "text", default: "" })
  dress_code!: string;

  @Column({ type: "text", default: "" })
  gift_registry_url!: string;

  @Column({ type: "jsonb", default: () => "'[]'::jsonb" })
  schedule!: ScheduleItem[];

  @Column({ type: "jsonb", default: () => "'[]'::jsonb" })
  custom_sections!: CustomSection[];

  @Column({ type: "text", default: "" })
  cover_image_url!: string;

  @CreateDateColumn({ type: "timestamptz" })
  created_at!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updated_at!: Date;
}
