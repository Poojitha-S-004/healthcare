import { Controller, Get, Param, Query, UseGuards, Req } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Patient, QueueEntry, TeleconsultSession } from "../../database/entities";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import {
  patientToFhir,
  encounterFromQueueEntry,
  encounterFromTeleconsult,
  createFhirBundle,
  FhirPatient,
  FhirEncounter,
} from "./fhir.types";

@Controller("fhir")
@UseGuards(JwtAuthGuard)
export class FhirController {
  constructor(
    @InjectRepository(Patient) private readonly patientRepo: Repository<Patient>,
    @InjectRepository(QueueEntry) private readonly queueRepo: Repository<QueueEntry>,
    @InjectRepository(TeleconsultSession) private readonly teleconsultRepo: Repository<TeleconsultSession>,
  ) {}

  @Get("Patient")
  async searchPatients(
    @Query("facilityId") facilityId?: string,
    @Query("name") name?: string,
    @Query("_id") id?: string,
    @Query("_count") count?: string,
  ) {
    const qb = this.patientRepo.createQueryBuilder("p");

    if (id) {
      qb.andWhere("p.id = :id", { id: Number(id) });
    }
    if (facilityId) {
      qb.andWhere("p.facilityId = :facilityId", { facilityId: Number(facilityId) });
    }
    if (name) {
      qb.andWhere("p.name ILIKE :name", { name: `%${name}%` });
    }

    const limit = count ? Math.min(Number(count), 100) : 20;
    qb.take(limit);
    qb.orderBy("p.id", "ASC");

    const patients = await qb.getMany();
    const fhirPatients: FhirPatient[] = patients.map(patientToFhir);

    return createFhirBundle(fhirPatients);
  }

  @Get("Patient/:id")
  async getPatient(@Param("id") id: string) {
    const patient = await this.patientRepo.findOne({ where: { id: Number(id) } });
    if (!patient) {
      return {
        resourceType: "OperationOutcome",
        issue: [
          {
            severity: "error",
            code: "not-found",
            diagnostics: `Patient ${id} not found`,
          },
        ],
      };
    }
    return patientToFhir(patient);
  }

  @Get("Encounter")
  async searchEncounters(
    @Query("facilityId") facilityId?: string,
    @Query("patientId") patientId?: string,
    @Query("status") status?: string,
    @Query("_count") count?: string,
  ) {
    const encounters: FhirEncounter[] = [];
    const limit = count ? Math.min(Number(count), 100) : 20;

    if (patientId) {
      const queueEntries = await this.queueRepo.find({
        where: { patientId: Number(patientId) },
        order: { enteredAt: "DESC" },
        take: limit,
      });
      encounters.push(...queueEntries.map((e) => encounterFromQueueEntry(e)));

      const teleconsults = await this.teleconsultRepo.find({
        where: { patientId: Number(patientId) },
        order: { scheduledAt: "DESC" },
        take: limit,
      });
      encounters.push(...teleconsults.map((s) => encounterFromTeleconsult(s)));
    } else if (facilityId) {
      const queueEntries = await this.queueRepo.find({
        where: { facilityId: Number(facilityId) },
        order: { enteredAt: "DESC" },
        take: limit,
      });
      encounters.push(...queueEntries.map((e) => encounterFromQueueEntry(e)));

      const teleconsults = await this.teleconsultRepo.find({
        where: { facilityId: Number(facilityId) },
        order: { scheduledAt: "DESC" },
        take: limit,
      });
      encounters.push(...teleconsults.map((s) => encounterFromTeleconsult(s)));
    }

    if (status) {
      const fhirStatusMap: Record<string, string> = {
        arrived: "waiting",
        triaged: "called",
        "in-progress": "in_progress",
        finished: "completed",
        cancelled: "transferred",
        onleave: "paused",
        planned: "scheduled",
      };
      const queueStatus = fhirStatusMap[status];
      if (queueStatus) {
        return createFhirBundle(
          encounters.filter((e) => e.status === status),
        );
      }
    }

    return createFhirBundle(encounters.slice(0, limit));
  }

  @Get("Encounter/:id")
  async getEncounter(@Param("id") id: string) {
    if (id.startsWith("teleconsult-")) {
      const sessionId = Number(id.replace("teleconsult-", ""));
      const session = await this.teleconsultRepo.findOne({ where: { id: sessionId } });
      if (!session) {
        return {
          resourceType: "OperationOutcome",
          issue: [{ severity: "error", code: "not-found", diagnostics: `Encounter ${id} not found` }],
        };
      }
      return encounterFromTeleconsult(session);
    }

    const entry = await this.queueRepo.findOne({ where: { id: Number(id) } });
    if (!entry) {
      return {
        resourceType: "OperationOutcome",
        issue: [{ severity: "error", code: "not-found", diagnostics: `Encounter ${id} not found` }],
      };
    }
    return encounterFromQueueEntry(entry);
  }
}
