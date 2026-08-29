import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import {
  User,
  Facility,
  FacilityMembership,
  SyncOperation,
  Patient,
  QueueEntry,
  TeleconsultSession,
  TriageResult,
  AuditLog,
} from "./entities";
import { TeleconsultMessage } from "../modules/teleconsult/teleconsult-message.entity";

const entities = [
  User,
  Facility,
  FacilityMembership,
  SyncOperation,
  Patient,
  QueueEntry,
  TeleconsultSession,
  TriageResult,
  AuditLog,
  TeleconsultMessage,
];

const hasDatabase = !!process.env.DATABASE_URL;

@Module({
  imports: hasDatabase
    ? [
        TypeOrmModule.forRootAsync({
          useFactory: () => ({
            type: "postgres" as const,
            url: process.env.DATABASE_URL,
            entities,
            synchronize: false,
            migrationsRun: true,
            migrations: [__dirname + "/migrations/*{.ts,.js}"],
            logging: process.env.NODE_ENV !== "production",
            ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
          }),
        }),
        TypeOrmModule.forFeature(entities),
      ]
    : [],
  exports: hasDatabase ? [TypeOrmModule] : [],
})
export class DatabaseModule {}
