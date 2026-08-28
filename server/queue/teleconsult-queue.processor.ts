import { Process, Processor } from "@nestjs/bull";
import { Logger } from "@nestjs/common";
import { Job } from "bull";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CacheService } from "../redis/cache.service";
import { TeleconsultSession } from "../database/entities";
import { TELECONSULT_QUEUE } from "./queue.constants";

export interface TeleconsultJob {
  sessionId: number;
  facilityId: number;
  patientId: number;
  clinicianId?: number;
  action: "schedule" | "start" | "end" | "cancel";
}

@Processor(TELECONSULT_QUEUE)
export class TeleconsultQueueProcessor {
  private readonly logger = new Logger(TeleconsultQueueProcessor.name);

  constructor(
    private readonly cache: CacheService,
    @InjectRepository(TeleconsultSession) private readonly sessionRepo: Repository<TeleconsultSession>,
  ) {}

  @Process("schedule")
  async handleSchedule(job: Job<TeleconsultJob>) {
    const { sessionId, facilityId, patientId, clinicianId } = job.data;
    const key = `teleconsult:active:${facilityId}`;

    const cacheEntry = {
      sessionId,
      patientId,
      clinicianId: clinicianId ?? null,
      status: "scheduled",
      scheduledAt: Date.now(),
    };
    await this.cache.setHash(key, String(sessionId), cacheEntry);

    try {
      const session = this.sessionRepo.create({
        id: sessionId,
        patientId,
        facilityId,
        clinicianId: clinicianId ?? null,
        status: "scheduled",
        scheduledAt: new Date(),
      });
      await this.sessionRepo.save(session);
    } catch (error) {
      this.logger.error(`Failed to persist teleconsult schedule for session ${sessionId}:`, error);
    }

    this.logger.log(`Scheduled teleconsult session ${sessionId} for facility ${facilityId}`);
    return { success: true };
  }

  @Process("start")
  async handleStart(job: Job<{ sessionId: number; facilityId: number; clinicianId: number }>) {
    const { sessionId, facilityId, clinicianId } = job.data;
    const key = `teleconsult:active:${facilityId}`;
    const session = await this.cache.getHash<any>(key, String(sessionId));

    if (session) {
      session.status = "active";
      session.startedAt = Date.now();
      session.clinicianId = clinicianId;
      await this.cache.setHash(key, String(sessionId), session);
    }

    try {
      await this.sessionRepo.update(
        { id: sessionId, facilityId },
        { status: "active" as any, startedAt: new Date(), clinicianId },
      );
    } catch (error) {
      this.logger.error(`Failed to persist teleconsult start for session ${sessionId}:`, error);
    }

    this.logger.log(`Started teleconsult session ${sessionId}`);
    return { success: true };
  }

  @Process("end")
  async handleEnd(job: Job<{ sessionId: number; facilityId: number }>) {
    const { sessionId, facilityId } = job.data;
    const key = `teleconsult:active:${facilityId}`;
    const session = await this.cache.getHash<any>(key, String(sessionId));

    if (session) {
      session.status = "completed";
      session.endedAt = Date.now();
      await this.cache.delHash(key, String(sessionId));
    }

    try {
      await this.sessionRepo.update(
        { id: sessionId, facilityId },
        { status: "completed" as any, endedAt: new Date() },
      );
    } catch (error) {
      this.logger.error(`Failed to persist teleconsult end for session ${sessionId}:`, error);
    }

    this.logger.log(`Ended teleconsult session ${sessionId}`);
    return { success: true };
  }

  @Process("cancel")
  async handleCancel(job: Job<{ sessionId: number; facilityId: number }>) {
    const { sessionId, facilityId } = job.data;
    const key = `teleconsult:active:${facilityId}`;
    await this.cache.delHash(key, String(sessionId));

    try {
      await this.sessionRepo.update(
        { id: sessionId, facilityId },
        { status: "cancelled" as any },
      );
    } catch (error) {
      this.logger.error(`Failed to persist teleconsult cancel for session ${sessionId}:`, error);
    }

    this.logger.log(`Cancelled teleconsult session ${sessionId}`);
    return { success: true };
  }
}
