import { Controller, Get, Post, Param, Body, UseGuards, Query } from "@nestjs/common";
import { FacilityService } from "./facility.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../../security/roles.guard";
import { Roles } from "../../security/roles.decorator";
import { AdminGuard } from "../../security/admin.guard";

@Controller("api/facilities")
export class FacilityController {
  constructor(private readonly facilityService: FacilityService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get(":id")
  @Roles("registration", "nurse", "clinician", "pharmacy", "referral", "manager", "supervisor")
  async findOne(@Param("id") id: number) {
    const facility = await this.facilityService.findById(Number(id));
    if (!facility) {
      throw new Error("Facility not found");
    }
    return facility;
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get(":id/members")
  @Roles("manager", "supervisor")
  async getMembers(@Param("id") id: number) {
    return this.facilityService.getMembers(Number(id));
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post()
  async create(@Body() body: { code: string; name: string; defaultLanguage?: "en" | "hi" }) {
    return this.facilityService.create(body);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post(":id/members")
  @Roles("manager", "supervisor")
  async addMember(
    @Param("id") facilityId: number,
    @Body() body: { userId: number; staffRole: string },
  ) {
    return this.facilityService.addMember({
      userId: body.userId,
      facilityId: Number(facilityId),
      staffRole: body.staffRole,
    });
  }
}
