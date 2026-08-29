import { ForbiddenException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { FacilityMembership } from "../database/entities";
import { StaffRole } from "./roles.decorator";

@Injectable()
export class FacilityAccessService {
  constructor(
    @InjectRepository(FacilityMembership)
    private readonly membershipRepo: Repository<FacilityMembership>,
  ) {}

  async assertAccess(userId: number, facilityId: number, roles?: StaffRole[]): Promise<FacilityMembership> {
    const membership = await this.membershipRepo.findOne({
      where: { userId, facilityId },
    });

    if (!membership) {
      throw new ForbiddenException("You are not a member of this facility");
    }

    if (roles?.length && !roles.includes(membership.staffRole as StaffRole)) {
      throw new ForbiddenException("Insufficient facility permissions");
    }

    return membership;
  }
}
