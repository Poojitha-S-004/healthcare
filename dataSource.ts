import "dotenv/config";
import "reflect-metadata";
import { DataSource } from "typeorm";
import { User } from "./server/database/entities/user.entity";
import { Facility } from "./server/database/entities/facility.entity";
import { FacilityMembership } from "./server/database/entities/facility-membership.entity";
import { SyncOperation } from "./server/database/entities/sync-operation.entity";
import { Patient } from "./server/database/entities/patient.entity";
import { QueueEntry } from "./server/database/entities/queue-entry.entity";
import { TeleconsultSession } from "./server/database/entities/teleconsult-session.entity";
import { TriageResult } from "./server/database/entities/triage-result.entity";

export default new DataSource({
  type: "postgres",
  url: process.env.DATABASE_URL,
  entities: [
    User,
    Facility,
    FacilityMembership,
    SyncOperation,
    Patient,
    QueueEntry,
    TeleconsultSession,
    TriageResult,
  ],
  migrations: ["./server/database/migrations/*.ts"],
  synchronize: false,
  logging: process.env.NODE_ENV !== "production",
});
