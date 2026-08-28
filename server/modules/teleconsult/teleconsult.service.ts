import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TeleconsultSession } from "../../database/entities";

@Injectable()
export class TeleconsultService {
  private readonly logger = new Logger(TeleconsultService.name);

  constructor(
    @InjectRepository(TeleconsultSession)
    private readonly sessionRepo: Repository<TeleconsultSession>,
  ) {}

  async create(data: {
    patientId: number;
    facilityId: number;
    clinicianId?: number;
    notes?: string;
  }): Promise<TeleconsultSession> {
    const session = this.sessionRepo.create({
      patientId: data.patientId,
      facilityId: data.facilityId,
      clinicianId: data.clinicianId ?? null,
      notes: data.notes ?? null,
      status: "scheduled",
      scheduledAt: new Date(),
    });
    return this.sessionRepo.save(session);
  }

  async findById(id: number): Promise<TeleconsultSession> {
    const session = await this.sessionRepo.findOne({ where: { id } });
    if (!session) throw new NotFoundException(`Teleconsult session ${id} not found`);
    return session;
  }

  async findByFacility(facilityId: number, status?: string): Promise<TeleconsultSession[]> {
    const where: any = { facilityId };
    if (status) where.status = status;
    return this.sessionRepo.find({
      where,
      order: { scheduledAt: "DESC" },
      take: 100,
    });
  }

  async findByPatient(patientId: number): Promise<TeleconsultSession[]> {
    return this.sessionRepo.find({
      where: { patientId },
      order: { scheduledAt: "DESC" },
      take: 50,
    });
  }

  async startSession(id: number, clinicianId: number): Promise<TeleconsultSession> {
    const session = await this.findById(id);
    if (session.status !== "scheduled") {
      throw new Error(`Cannot start session in ${session.status} status`);
    }
    session.status = "active";
    session.clinicianId = clinicianId;
    session.startedAt = new Date();
    return this.sessionRepo.save(session);
  }

  async endSession(id: number, notes?: string): Promise<TeleconsultSession> {
    const session = await this.findById(id);
    if (session.status !== "active") {
      throw new Error(`Cannot end session in ${session.status} status`);
    }
    session.status = "completed";
    session.endedAt = new Date();
    if (notes) session.notes = notes;
    return this.sessionRepo.save(session);
  }

  async cancelSession(id: number): Promise<TeleconsultSession> {
    const session = await this.findById(id);
    if (session.status === "completed") {
      throw new Error("Cannot cancel a completed session");
    }
    session.status = "cancelled";
    return this.sessionRepo.save(session);
  }

  async getActiveSessions(facilityId: number): Promise<TeleconsultSession[]> {
    return this.sessionRepo.find({
      where: { facilityId, status: "active" as any },
      order: { startedAt: "DESC" },
    });
  }
}
