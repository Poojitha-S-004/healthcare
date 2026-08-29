import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { FacilityMembership } from "../database/entities";
import { ROLES_KEY, StaffRole } from "./roles.decorator";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @InjectRepository(FacilityMembership)
    private readonly membershipRepo: Repository<FacilityMembership>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<StaffRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles?.length) return true;

    const req = context.switchToHttp().getRequest();
    const user = req.user;
    if (!user?.id) throw new UnauthorizedException("Authentication required");

    // Global admin remains allowed for administrative operations.
    if (user.role === "admin") return true;

    const facilityId = this.resolveFacilityId(req);
    if (!facilityId) {
      throw new ForbiddenException("A facility context is required for this operation");
    }

    const membership = await this.membershipRepo.findOne({
      where: {
        userId: Number(user.id),
        facilityId,
      },
    });

    if (!membership || !requiredRoles.includes(membership.staffRole as StaffRole)) {
      throw new ForbiddenException("Insufficient facility permissions");
    }

    req.facilityMembership = membership;
    return true;
  }

  private resolveFacilityId(req: any): number | null {
    const raw = req.params?.facilityId ?? req.query?.facilityId ?? req.body?.facilityId
      ?? (String(req.path).startsWith("/api/facilities/") ? req.params?.id : undefined);
    const facilityId = Number(raw);
    return Number.isInteger(facilityId) && facilityId > 0 ? facilityId : null;
  }
}
