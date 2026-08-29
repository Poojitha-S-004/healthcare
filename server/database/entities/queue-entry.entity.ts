import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { Patient } from "./patient.entity";

export type QueueStatus = "waiting" | "called" | "in_progress" | "completed" | "transferred" | "paused";

@Entity("queue_entries")
export class QueueEntry {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "int" })
  patientId: number;

  @Column({ type: "int" })
  facilityId: number;

  @Column({ type: "varchar", length: 64 })
  serviceType: string;

  @Column({ type: "enum", enum: ["emergency", "urgent", "priority", "routine"], default: "routine" })
  careCategory: "emergency" | "urgent" | "priority" | "routine";

  @Column({ type: "varchar", length: 512, nullable: true })
  priorityReason: string | null;

  @Column({ type: "int", default: 0 })
  tokenNumber: number;

  @Column({
    type: "enum",
    enum: ["waiting", "called", "in_progress", "completed", "transferred", "paused"],
    default: "waiting",
  })
  status: QueueStatus;

  @Column({ type: "timestamptz", default: () => "NOW()" })
  enteredAt: Date;

  @Column({ type: "timestamptz", nullable: true })
  calledAt: Date | null;

  @Column({ type: "timestamptz", nullable: true })
  completedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Patient, (p) => p.queueEntries, { onDelete: "CASCADE" })
  @JoinColumn({ name: "patientId" })
  patient: Patient;
}
