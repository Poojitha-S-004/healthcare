import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from "typeorm";
import { FacilityMembership } from "./facility-membership.entity";
import { SyncOperation } from "./sync-operation.entity";

@Entity("users")
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "varchar", length: 64, unique: true })
  openId: string;

  @Column({ type: "text", nullable: true })
  name: string | null;

  @Column({ type: "varchar", length: 320, nullable: true })
  email: string | null;

  @Column({ type: "varchar", length: 64, nullable: true })
  loginMethod: string | null;

  @Column({ type: "enum", enum: ["user", "admin"], default: "user" })
  role: "user" | "admin";

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: "timestamptz", default: () => "NOW()" })
  lastSignedIn: Date;

  @OneToMany(() => FacilityMembership, (fm) => fm.user)
  facilityMemberships: FacilityMembership[];

  @OneToMany(() => SyncOperation, (so) => so.user)
  syncOperations: SyncOperation[];
}
