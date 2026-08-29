import { Controller, Get, Query, UseGuards, Request, ParseIntPipe } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AuditLog } from "./audit-log.entity";
import { JwtAuthGuard } from "../modules/auth/jwt-auth.guard";
import { RolesGuard } from "../security/roles.guard";
import { Roles } from "../security/roles.decorator";

@Controller("api/audit")
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuditController {
  constructor(@InjectRepository(AuditLog) private readonly auditRepo: Repository<AuditLog>) {}

  @Get("logs")
  @Roles("manager", "supervisor")
  async list(
    @Query("facilityId", ParseIntPipe) facilityId: number,
    @Query("limit") rawLimit?: string,
  ) {
    const limit = Math.min(Math.max(Number(rawLimit ?? 100), 1), 500);
    return this.auditRepo.find({
      where: { facilityId },
      order: { createdAt: "DESC" },
      take: limit,
      select: [
        "id",
        "actorUserId",
        "facilityId",
        "action",
        "resource",
        "resourceId",
        "method",
        "path",
        "statusCode",
        "success",
        "createdAt",
      ],
    });
  }
}
