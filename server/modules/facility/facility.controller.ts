import { Controller, Get, Post, Param, Body, UseGuards, Query } from "@nestjs/common";
import { FacilityService } from "./facility.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";

@Controller("api/facilities")
export class FacilityController {
  constructor(private readonly facilityService: FacilityService) {}

  @UseGuards(JwtAuthGuard)
  @Get(":id")
  async findOne(@Param("id") id: number) {
    const facility = await this.facilityService.findById(Number(id));
    if (!facility) {
      throw new Error("Facility not found");
    }
    return facility;
  }

  @UseGuards(JwtAuthGuard)
  @Get(":id/members")
  async getMembers(@Param("id") id: number) {
    return this.facilityService.getMembers(Number(id));
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Body() body: { code: string; name: string; defaultLanguage?: "en" | "hi" }) {
    return this.facilityService.create(body);
  }

  @UseGuards(JwtAuthGuard)
  @Post(":id/members")
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
