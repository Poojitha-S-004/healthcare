import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Patient, SyncOperation } from "../../database/entities";
import { PatientService } from "./patient.service";
import { PatientController } from "./patient.controller";
import { SyncService } from "./sync.service";
import { CacheService } from "../../redis/cache.service";

@Module({
  imports: [TypeOrmModule.forFeature([Patient, SyncOperation])],
  providers: [PatientService, SyncService],
  controllers: [PatientController],
  exports: [PatientService, SyncService],
})
export class PatientModule {}
