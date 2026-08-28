import { Injectable, Logger } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bull";
import { Queue } from "bull";
import { PATIENT_QUEUE } from "./queue.constants";

@Injectable()
export class PatientQueueService {
  private readonly logger = new Logger(PatientQueueService.name);

  constructor(
    @InjectQueue(PATIENT_QUEUE) private readonly queue: Queue,
  ) {}

  async enqueue(data: {
    facilityId: number;
    patientId: number;
    serviceType: string;
    careCategory: "emergency" | "urgent" | "priority" | "routine";
    priorityReason?: string;
  }) {
    return this.queue.add("enqueue", data, {
      priority: this.getPriorityValue(data.careCategory),
      removeOnComplete: true,
      removeOnFail: false,
    });
  }

  async callNext(facilityId: number, serviceType?: string) {
    return this.queue.add("call_next", { facilityId, serviceType }, {
      removeOnComplete: true,
    });
  }

  async call(facilityId: number, patientId: number) {
    return this.queue.add("call", { facilityId, patientId }, {
      removeOnComplete: true,
    });
  }

  async complete(facilityId: number, patientId: number) {
    return this.queue.add("complete", { facilityId, patientId }, {
      removeOnComplete: true,
    });
  }

  async transfer(facilityId: number, patientId: number, targetFacilityId: number) {
    return this.queue.add("transfer", { facilityId, patientId, targetFacilityId }, {
      priority: this.getPriorityValue("urgent"),
      removeOnComplete: true,
    });
  }

  async pause(facilityId: number, patientId: number) {
    return this.queue.add("pause", { facilityId, patientId }, {
      removeOnComplete: true,
    });
  }

  async getQueueStats(facilityId: number) {
    const counts = await this.queue.getJobCounts();
    return { facilityId, ...counts };
  }

  private getPriorityValue(category: string): number {
    switch (category) {
      case "emergency": return 1;
      case "urgent": return 2;
      case "priority": return 3;
      case "routine": return 4;
      default: return 5;
    }
  }
}
