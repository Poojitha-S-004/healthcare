import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from "typeorm";
import { User } from "./user.entity";
import { Facility } from "./facility.entity";

@Entity("facility_memberships")
@Index("facilityMembership_user_facility_role", ["userId", "facilityId", "staffRole"], { unique: true })
export class FacilityMembership {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "int" })
  userId: number;

  @Column({ type: "int" })
  facilityId: number;

  @Column({
    type: "enum",
    enum: ["registration", "nurse", "clinician", "pharmacy", "referral", "manager", "supervisor"],
  })
  staffRole:
    | "registration"
    | "nurse"
    | "clinician"
    | "pharmacy"
    | "referral"
    | "manager"
    | "supervisor";

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => User, (u) => u.facilityMemberships, { onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user: User;

  @ManyToOne(() => Facility, (f) => f.facilityMemberships, { onDelete: "CASCADE" })
  @JoinColumn({ name: "facilityId" })
  facility: Facility;
}
