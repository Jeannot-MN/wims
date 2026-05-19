import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from "typeorm";

@Entity({ name: "invitees" })
export class InviteeEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({ type: "uuid" })
  event_id!: string;

  @Index({ unique: true })
  @Column({ type: "varchar", length: 16 })
  invite_token!: string;

  @Column({ type: "varchar", length: 120 })
  primary_first_name!: string;

  @Column({ type: "varchar", length: 120 })
  primary_last_name!: string;

  @Column({ type: "varchar", length: 120, nullable: true })
  partner_first_name!: string | null;

  @Column({ type: "varchar", length: 120, nullable: true })
  partner_last_name!: string | null;

  @Column({ type: "varchar", length: 320, nullable: true })
  email!: string | null;

  @Column({ type: "varchar", length: 40, nullable: true })
  mobile_no!: string | null;

  @CreateDateColumn({ type: "timestamptz" })
  created_at!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updated_at!: Date;
}
