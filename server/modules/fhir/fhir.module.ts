import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Patient, QueueEntry, TeleconsultSession } from "../../database/entities";
import { FhirController } from "./fhir.controller";

@Module({
  imports: [TypeOrmModule.forFeature([Patient, QueueEntry, TeleconsultSession])],
  controllers: [FhirController],
})
export class FhirModule {}
