import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TeleconsultMessage } from "./teleconsult-message.entity";
import { TeleconsultSession } from "../../database/entities/teleconsult-session.entity";
import { User } from "../../database/entities/user.entity";
import { FacilityAccessService } from "../../security/facility-access.service";
import { StaffRole } from "../../security/roles.decorator";

const CHAT_ROLES: StaffRole[] = ["nurse", "clinician", "referral", "manager", "supervisor"];
const MAX_MESSAGE_LENGTH = 2000;

@Injectable()
export class TeleconsultMessageService {
  constructor(
    @InjectRepository(TeleconsultMessage)
    private readonly messageRepo: Repository<TeleconsultMessage>,
    @InjectRepository(TeleconsultSession)
    private readonly sessionRepo: Repository<TeleconsultSession>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly access: FacilityAccessService,
  ) {}

  private async getSessionForUser(sessionId: number, userId: number) {
    const session = await this.sessionRepo.findOne({ where: { id: sessionId } });
    if (!session) throw new NotFoundException(`Teleconsult session ${sessionId} not found`);
    await this.access.assertAccess(userId, session.facilityId, CHAT_ROLES);
    return session;
  }

  async list(sessionId: number, userId: number, afterId?: number) {
    await this.getSessionForUser(sessionId, userId);
    const qb = this.messageRepo
      .createQueryBuilder("message")
      .where("message.sessionId = :sessionId", { sessionId })
      .orderBy("message.id", "ASC")
      .take(200);

    if (afterId && Number.isInteger(afterId) && afterId > 0) {
      qb.andWhere("message.id > :afterId", { afterId });
    }

    return qb.getMany();
  }

  async send(sessionId: number, userId: number, payload: { content?: string }) {
    const session = await this.getSessionForUser(sessionId, userId);
    if (session.status === "completed" || session.status === "cancelled") {
      throw new BadRequestException("This teleconsult is closed");
    }

    const content = String(payload?.content ?? "").trim();
    if (!content) throw new BadRequestException("Message cannot be empty");
    if (content.length > MAX_MESSAGE_LENGTH) {
      throw new BadRequestException(`Message must be ${MAX_MESSAGE_LENGTH} characters or fewer`);
    }

    const membership = await this.access.assertAccess(userId, session.facilityId, CHAT_ROLES);
    const user = await this.userRepo.findOne({ where: { id: userId } });
    const message = this.messageRepo.create({
      sessionId,
      senderUserId: userId,
      senderRole: membership.staffRole,
      senderName: user?.name || `Staff #${userId}`,
      content,
    });
    return this.messageRepo.save(message);
  }
}
