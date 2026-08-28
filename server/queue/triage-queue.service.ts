import { Injectable, Logger } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bull";
import { Queue } from "bull";
import { TRIAGE_QUEUE } from "./queue.constants";

@Injectable()
export class TriageQueueService {
  private readonly logger = new Logger(TriageQueueService.name);

  constructor(
    @InjectQueue(TRIAGE_QUEUE) private readonly queue: Queue,
  ) {}

  async assess(data: {
    patientId: number;
    facilityId: number;
    serviceType: string;
    screeningData: Record<string, unknown>;
    clinicianOverride?: {
      careCategory: string;
      reason: string;
    };
  }) {
    return this.queue.add("assess", data, {
      priority: data.clinicianOverride ? 1 : 3,
      removeOnComplete: true,
    });
  }
}
