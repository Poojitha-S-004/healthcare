import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { BullModule } from "@nestjs/bull";
import { RedisModule } from "../redis/redis.module";
import { PatientQueueService } from "./patient-queue.service";
import { PatientQueueProcessor } from "./patient-queue.processor";
import { TeleconsultQueueService } from "./teleconsult-queue.service";
import { TeleconsultQueueProcessor } from "./teleconsult-queue.processor";
import { TriageQueueService } from "./triage-queue.service";
import { TriageQueueProcessor } from "./triage-queue.processor";
import { QueueRealtimeService } from "./queue-realtime.service";
import { PATIENT_QUEUE, TELECONSULT_QUEUE, TRIAGE_QUEUE } from "./queue.constants";
import { QueueEntry, TeleconsultSession, TriageResult } from "../database/entities";

@Module({
  imports: [
    RedisModule,
    TypeOrmModule.forFeature([QueueEntry, TeleconsultSession, TriageResult]),
    BullModule.registerQueue(
      { name: PATIENT_QUEUE },
      { name: TELECONSULT_QUEUE },
      { name: TRIAGE_QUEUE },
    ),
  ],
  providers: [
    PatientQueueService,
    PatientQueueProcessor,
    TeleconsultQueueService,
    TeleconsultQueueProcessor,
    TriageQueueService,
    TriageQueueProcessor,
    QueueRealtimeService,
  ],
  exports: [
    PatientQueueService,
    TeleconsultQueueService,
    TriageQueueService,
    QueueRealtimeService,
  ],
})
export class QueueModule {}
