import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";

export type TeleconsultStatus = "scheduled" | "active" | "completed" | "cancelled";

@Entity("teleconsult_sessions")
export class TeleconsultSession {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "int" })
  patientId: number;

  @Column({ type: "int" })
  facilityId: number;

  @Column({ type: "int", nullable: true })
  clinicianId: number | null;

  @Column({
    type: "enum",
    enum: ["scheduled", "active", "completed", "cancelled"],
    default: "scheduled",
  })
  status: TeleconsultStatus;

  @Column({ type: "timestamptz", nullable: true })
  scheduledAt: Date | null;

  @Column({ type: "timestamptz", nullable: true })
  startedAt: Date | null;

  @Column({ type: "timestamptz", nullable: true })
  endedAt: Date | null;

  @Column({ type: "text", nullable: true })
  notes: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
