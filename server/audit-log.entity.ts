import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from "typeorm";

@Entity("audit_logs")
@Index("audit_logs_actor_created", ["actorUserId", "createdAt"])
@Index("audit_logs_facility_created", ["facilityId", "createdAt"])
export class AuditLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "int", nullable: true })
  actorUserId: number | null;

  @Column({ type: "int", nullable: true })
  facilityId: number | null;

  @Column({ type: "varchar", length: 64 })
  action: string;

  @Column({ type: "varchar", length: 64 })
  resource: string;

  @Column({ type: "varchar", length: 128, nullable: true })
  resourceId: string | null;

  @Column({ type: "varchar", length: 16 })
  method: string;

  @Column({ type: "varchar", length: 512 })
  path: string;

  @Column({ type: "int" })
  statusCode: number;

  @Column({ type: "boolean", default: true })
  success: boolean;

  @Column({ type: "varchar", length: 64, nullable: true })
  ipAddress: string | null;

  @Column({ type: "varchar", length: 256, nullable: true })
  userAgent: string | null;

  // Never store request/response bodies here: they may contain PHI or credentials.
  @Column({ type: "jsonb", nullable: true })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt: Date;
}
