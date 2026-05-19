import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from "typeorm";

export type RsvpStatus = "pending" | "accepted" | "declined" | "maybe";

@Entity({ name: "rsvps" })
export class RsvpEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index({ unique: true })
  @Column({ type: "uuid" })
  invitee_id!: string;

  @Column({ type: "varchar", length: 16, default: "pending" })
  status!: RsvpStatus;

  @Column({ type: "text", default: "" })
  dietary_restrictions!: string;

  @Column({ type: "text", default: "" })
  song_requests!: string;

  @Column({ type: "boolean", default: false })
  accommodation_needed!: boolean;

  @Column({ type: "timestamptz", nullable: true })
  submitted_at!: Date | null;

  @CreateDateColumn({ type: "timestamptz" })
  created_at!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updated_at!: Date;
}
