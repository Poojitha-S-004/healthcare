import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity("triage_results")
export class TriageResult {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "int" })
  patientId: number;

  @Column({ type: "int" })
  facilityId: number;

  @Column({ type: "varchar", length: 64 })
  careCategory: string;

  @Column({ type: "int", default: 0 })
  riskScore: number;

  @Column({ type: "varchar", length: 64, nullable: true })
  serviceType: string | null;

  @Column({ type: "text", nullable: true })
  reason: string | null;

  @Column({ type: "varchar", length: 64, default: "rule_based" })
  assessedBy: string;

  @Column({ type: "jsonb", nullable: true })
  screeningData: Record<string, unknown> | null;

  @Column({ type: "timestamptz", default: () => "NOW()" })
  assessedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
