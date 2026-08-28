import { Controller, Get, Post, Param, Body, UseGuards, Query } from "@nestjs/common";
import { TeleconsultService } from "./teleconsult.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";

@Controller("api/teleconsult")
@UseGuards(JwtAuthGuard)
export class TeleconsultController {
  constructor(private readonly teleconsultService: TeleconsultService) {}

  @Post()
  async create(
    @Body()
    body: {
      patientId: number;
      facilityId: number;
      clinicianId?: number;
      notes?: string;
    },
  ) {
    return this.teleconsultService.create(body);
  }

  @Get()
  async findByFacility(
    @Query("facilityId") facilityId: string,
    @Query("status") status?: string,
  ) {
    return this.teleconsultService.findByFacility(Number(facilityId), status);
  }

  @Get("patient/:patientId")
  async findByPatient(@Param("patientId") patientId: string) {
    return this.teleconsultService.findByPatient(Number(patientId));
  }

  @Get("active/:facilityId")
  async getActive(@Param("facilityId") facilityId: string) {
    return this.teleconsultService.getActiveSessions(Number(facilityId));
  }

  @Get(":id")
  async findOne(@Param("id") id: string) {
    return this.teleconsultService.findById(Number(id));
  }

  @Post(":id/start")
  async start(@Param("id") id: string, @Body() body: { clinicianId: number }) {
    return this.teleconsultService.startSession(Number(id), body.clinicianId);
  }

  @Post(":id/end")
  async end(@Param("id") id: string, @Body() body?: { notes?: string }) {
    return this.teleconsultService.endSession(Number(id), body?.notes);
  }

  @Post(":id/cancel")
  async cancel(@Param("id") id: string) {
    return this.teleconsultService.cancelSession(Number(id));
  }
}
