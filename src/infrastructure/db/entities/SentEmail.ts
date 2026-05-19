import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from "typeorm";

export type EmailKind =
  | "verification"
  | "password_reset"
  | "rsvp_confirmation";

@Entity({ name: "sent_emails" })
export class SentEmailEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({ type: "varchar", length: 320 })
  to_address!: string;

  @Column({ type: "varchar", length: 512 })
  subject!: string;

  @Column({ type: "text" })
  body!: string;

  @Column({ type: "varchar", length: 64 })
  kind!: EmailKind;

  @CreateDateColumn({ type: "timestamptz" })
  sent_at!: Date;
}
