import { Injectable, Logger, NotFoundException, BadRequestException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TeleconsultSession } from "../../database/entities";
import { FacilityAccessService } from "../../security/facility-access.service";
import { StaffRole } from "../../security/roles.decorator";

@Injectable()
export class TeleconsultService {
  private readonly logger = new Logger(TeleconsultService.name);

  constructor(
    @InjectRepository(TeleconsultSession)
    private readonly sessionRepo: Repository<TeleconsultSession>,
    private readonly access: FacilityAccessService,
  ) {}

  async create(data: {
    patientId: number;
    facilityId: number;
    clinicianId?: number;
    notes?: string;
    actorUserId: number;
  }): Promise<TeleconsultSession> {
    await this.access.assertAccess(data.actorUserId, data.facilityId, ["nurse", "clinician", "referral"]);
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

  async findById(id: number, actorUserId: number): Promise<TeleconsultSession> {
    const session = await this.sessionRepo.findOne({ where: { id } });
    if (!session) throw new NotFoundException(`Teleconsult session ${id} not found`);
    await this.access.assertAccess(actorUserId, session.facilityId, ["clinician", "nurse", "referral", "manager", "supervisor"]);
    return session;
  }

  async findByFacility(facilityId: number, actorUserId: number, status?: string): Promise<TeleconsultSession[]> {
    await this.access.assertAccess(actorUserId, facilityId, ["clinician", "nurse", "referral", "manager", "supervisor"]);
    const where: any = { facilityId };
    if (status) where.status = status;
    return this.sessionRepo.find({
      where,
      order: { scheduledAt: "DESC" },
      take: 100,
    });
  }

  async findByPatient(patientId: number, actorUserId: number): Promise<TeleconsultSession[]> {
    const sessions = await this.sessionRepo.find({
      where: { patientId },
      order: { scheduledAt: "DESC" },
      take: 50,
    });
    if (sessions.length) {
      await this.access.assertAccess(actorUserId, sessions[0].facilityId, ["clinician", "nurse", "referral", "manager", "supervisor"]);
    }
    return sessions;
  }

  async startSession(id: number, clinicianId: number, actorUserId: number): Promise<TeleconsultSession> {
    const session = await this.findById(id, actorUserId);
    await this.access.assertAccess(actorUserId, session.facilityId, ["clinician"]);
    if (session.status !== "scheduled") {
      throw new BadRequestException(`Cannot start session in ${session.status} status`);
    }
    session.status = "active";
    session.clinicianId = clinicianId;
    session.startedAt = new Date();
    return this.sessionRepo.save(session);
  }

  async endSession(id: number, actorUserId: number, notes?: string): Promise<TeleconsultSession> {
    const session = await this.findById(id, actorUserId);
    await this.access.assertAccess(actorUserId, session.facilityId, ["clinician"]);
    if (session.status !== "active") {
      throw new BadRequestException(`Cannot end session in ${session.status} status`);
    }
    session.status = "completed";
    session.endedAt = new Date();
    if (notes) session.notes = notes;
    return this.sessionRepo.save(session);
  }

  async cancelSession(id: number, actorUserId: number): Promise<TeleconsultSession> {
    const session = await this.findById(id, actorUserId);
    await this.access.assertAccess(actorUserId, session.facilityId, ["clinician", "referral"]);
    if (session.status === "completed") {
      throw new BadRequestException("Cannot cancel a completed session");
    }
    session.status = "cancelled";
    return this.sessionRepo.save(session);
  }

  async getActiveSessions(facilityId: number, actorUserId: number): Promise<TeleconsultSession[]> {
    await this.access.assertAccess(actorUserId, facilityId, ["clinician", "nurse", "referral", "manager", "supervisor"]);
    return this.sessionRepo.find({
      where: { facilityId, status: "active" as any },
      order: { startedAt: "DESC" },
    });
  }
}
