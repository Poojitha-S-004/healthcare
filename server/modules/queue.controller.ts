import { Controller, Post, Get, Param, Body, UseGuards, Query, Res, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Response } from "express";
import { PatientQueueService } from "../queue/patient-queue.service";
import { TriageQueueService } from "../queue/triage-queue.service";
import { QueueRealtimeService } from "../queue/queue-realtime.service";
import { CacheService } from "../redis/cache.service";
import { TriageResult } from "../database/entities";
import { JwtAuthGuard } from "./auth/jwt-auth.guard";

@Controller("api/queue")
@UseGuards(JwtAuthGuard)
export class QueueController {
  private readonly logger = new Logger(QueueController.name);

  constructor(
    private readonly patientQueue: PatientQueueService,
    private readonly realtime: QueueRealtimeService,
    private readonly cache: CacheService,
  ) {}

  @Post("enqueue")
  async enqueue(
    @Body()
    body: {
      facilityId: number;
      patientId: number;
      serviceType: string;
      careCategory: "emergency" | "urgent" | "priority" | "routine";
      priorityReason?: string;
    },
  ) {
    const job = await this.patientQueue.enqueue(body);
    return { jobId: job.id, status: "queued" };
  }

  @Post("call-next/:facilityId")
  async callNext(
    @Param("facilityId") facilityId: string,
    @Query("serviceType") serviceType?: string,
  ) {
    const job = await this.patientQueue.callNext(Number(facilityId), serviceType);
    return { jobId: job.id, status: "calling" };
  }

  @Post("call/:facilityId/:patientId")
  async call(
    @Param("facilityId") facilityId: string,
    @Param("patientId") patientId: string,
  ) {
    const job = await this.patientQueue.call(Number(facilityId), Number(patientId));
    return { jobId: job.id, status: "calling" };
  }

  @Post("complete/:facilityId/:patientId")
  async complete(
    @Param("facilityId") facilityId: string,
    @Param("patientId") patientId: string,
  ) {
    const job = await this.patientQueue.complete(Number(facilityId), Number(patientId));
    return { jobId: job.id, status: "completed" };
  }

  @Post("transfer/:facilityId/:patientId")
  async transfer(
    @Param("facilityId") facilityId: string,
    @Param("patientId") patientId: string,
    @Body() body: { targetFacilityId: number },
  ) {
    const job = await this.patientQueue.transfer(
      Number(facilityId),
      Number(patientId),
      body.targetFacilityId,
    );
    return { jobId: job.id, status: "transferring" };
  }

  @Post("pause/:facilityId/:patientId")
  async pause(
    @Param("facilityId") facilityId: string,
    @Param("patientId") patientId: string,
  ) {
    const job = await this.patientQueue.pause(Number(facilityId), Number(patientId));
    return { jobId: job.id, status: "paused" };
  }

  /**
   * Current queue snapshot for a facility (from the fast cache store).
   * Used by the doctor portal to render the board and by SSE clients on connect.
   */
  @Get(":facilityId")
  async facilityQueue(@Param("facilityId") facilityId: string) {
    const facility = Number(facilityId);
    const hash = (await this.cache.getAllHash(`queue:facility:${facility}`)) ?? {};
    const entries = Object.values(hash).filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === "object");
    const priorityOrder = ["emergency", "urgent", "priority", "routine"];
    entries.sort((a, b) => {
      const pA = priorityOrder.indexOf(String(a.careCategory));
      const pB = priorityOrder.indexOf(String(b.careCategory));
      if (pA !== pB) return pA - pB;
      return Number(a.enteredAt ?? 0) - Number(b.enteredAt ?? 0);
    });
    return {
      facilityId: facility,
      entries: entries.map((entry) => ({ ...entry, facilityId: facility })),
    };
  }

  /**
   * Server-Sent Events stream of live queue updates for a facility.
   * Emits an initial snapshot, then each subsequent queue event.
   */
  @Get("events/:facilityId")
  async streamFacilityQueue(
    @Param("facilityId") facilityId: string,
    @Res() res: Response,
  ) {
    const facility = Number(facilityId);

    res.status(200).set({
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });
    res.flushHeaders?.();

    const send = (event: string, data: unknown) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    // Initial snapshot from the fast in-memory/Redis store.
    const snapshot = (await this.cache.getAllHash<Record<string, unknown>>(`queue:facility:${facility}`)) ?? {};
    send("snapshot", { facilityId: facility, entries: snapshot });

    const unsubscribe = this.realtime.subscribe(facility, (event) => {
      send("queue.update", event);
    });

    // Heartbeat every 25s to keep proxies from dropping the connection.
    const heartbeat = setInterval(() => {
      res.write(": ping\n\n");
    }, 25000);

    res.on("close", () => {
      clearInterval(heartbeat);
      unsubscribe();
    });
  }
}

@Controller("api/triage")
@UseGuards(JwtAuthGuard)
export class TriageController {
  constructor(
    private readonly triageQueue: TriageQueueService,
    @InjectRepository(TriageResult) private readonly triageRepo: Repository<TriageResult>,
  ) {}

  @Post("assess")
  async assess(
    @Body()
    body: {
      patientId: number;
      facilityId: number;
      serviceType: string;
      screeningData: Record<string, unknown>;
      symptomText?: string;
      clinicianOverride?: {
        careCategory: string;
        reason: string;
      };
    },
  ) {
    const job = await this.triageQueue.assess(body);
    return { jobId: job.id, status: "assessing" };
  }

  @Get("results/:facilityId")
  async getResults(
    @Param("facilityId") facilityId: string,
    @Query("patientId") patientId?: string,
  ) {
    const where: any = { facilityId: Number(facilityId) };
    if (patientId) where.patientId = Number(patientId);
    return this.triageRepo.find({
      where,
      order: { assessedAt: "DESC" },
      take: 100,
    });
  }
}
