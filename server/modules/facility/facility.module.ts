import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Facility, FacilityMembership, User } from "../../database/entities";
import { FacilityService } from "./facility.service";
import { FacilityController } from "./facility.controller";
import { CacheService } from "../../redis/cache.service";

@Module({
  imports: [TypeOrmModule.forFeature([Facility, FacilityMembership, User])],
  providers: [FacilityService],
  controllers: [FacilityController],
  exports: [FacilityService],
})
export class FacilityModule {}
