import { Injectable, Logger } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bull";
import { Queue } from "bull";
import { TELECONSULT_QUEUE } from "./queue.constants";

@Injectable()
export class TeleconsultQueueService {
  private readonly logger = new Logger(TeleconsultQueueService.name);

  constructor(
    @InjectQueue(TELECONSULT_QUEUE) private readonly queue: Queue,
  ) {}

  async schedule(data: {
    sessionId: number;
    facilityId: number;
    patientId: number;
    clinicianId?: number;
  }) {
    return this.queue.add("schedule", data, { removeOnComplete: true });
  }

  async start(sessionId: number, facilityId: number, clinicianId: number) {
    return this.queue.add("start", { sessionId, facilityId, clinicianId }, {
      removeOnComplete: true,
    });
  }

  async end(sessionId: number, facilityId: number) {
    return this.queue.add("end", { sessionId, facilityId }, {
      removeOnComplete: true,
    });
  }

  async cancel(sessionId: number, facilityId: number) {
    return this.queue.add("cancel", { sessionId, facilityId }, {
      removeOnComplete: true,
    });
  }
}
