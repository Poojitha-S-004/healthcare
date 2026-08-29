import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from "typeorm";
import { Facility } from "./facility.entity";
import { QueueEntry } from "./queue-entry.entity";

export type CareCategory = "emergency" | "urgent" | "priority" | "routine";

@Entity("patients")
export class Patient {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "varchar", length: 128 })
  localId: string;

  @Column({ type: "varchar", length: 255 })
  name: string;

  @Column({ type: "date", nullable: true })
  dateOfBirth: Date | null;

  @Column({ type: "varchar", length: 16, nullable: true })
  gender: string | null;

  @Column({ type: "int" })
  facilityId: number;

  @Column({ type: "text", nullable: true })
  guardianName: string | null;

  @Column({ type: "varchar", length: 32, nullable: true })
  contactPhone: string | null;

  @Column({ type: "enum", enum: ["emergency", "urgent", "priority", "routine"], default: "routine" })
  careCategory: CareCategory;

  @Column({ type: "text", nullable: true })
  allergies: string | null;

  @Column({ type: "text", nullable: true })
  currentMedicines: string | null;

  @Column({ type: "timestamptz", default: () => "NOW()" })
  registeredAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Facility, (f) => f.patients, { onDelete: "CASCADE" })
  @JoinColumn({ name: "facilityId" })
  facility: Facility;

  @OneToMany(() => QueueEntry, (qe) => qe.patient)
  queueEntries: QueueEntry[];
}
