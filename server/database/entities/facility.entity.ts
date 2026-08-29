import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from "typeorm";
import { FacilityMembership } from "./facility-membership.entity";
import { Patient } from "./patient.entity";

@Entity("facilities")
export class Facility {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "varchar", length: 64, unique: true })
  code: string;

  @Column({ type: "varchar", length: 255 })
  name: string;

  @Column({ type: "enum", enum: ["en", "hi"], default: "en" })
  defaultLanguage: "en" | "hi";

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => FacilityMembership, (fm) => fm.facility)
  facilityMemberships: FacilityMembership[];

  @OneToMany(() => Patient, (p) => p.facility)
  patients: Patient[];
}
