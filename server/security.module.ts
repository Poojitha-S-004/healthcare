import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { FacilityMembership } from "../database/entities";
import { RolesGuard } from "./roles.guard";
import { FacilityAccessService } from "./facility-access.service";
import { AdminGuard } from "./admin.guard";

@Module({
  imports: [TypeOrmModule.forFeature([FacilityMembership])],
  providers: [RolesGuard, FacilityAccessService, AdminGuard],
  exports: [RolesGuard, FacilityAccessService, AdminGuard],
})
export class SecurityModule {}
