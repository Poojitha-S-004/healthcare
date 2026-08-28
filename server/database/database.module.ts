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
} from "./entities";

const entities = [
  User,
  Facility,
  FacilityMembership,
  SyncOperation,
  Patient,
  QueueEntry,
  TeleconsultSession,
  TriageResult,
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
            synchronize: process.env.NODE_ENV !== "production",
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
