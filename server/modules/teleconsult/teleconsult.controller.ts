import { Controller, Get, Post, Param, Body, UseGuards, Query, Request } from "@nestjs/common";
import { TeleconsultService } from "./teleconsult.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";

@Controller("api/teleconsult")
@UseGuards(JwtAuthGuard)
export class TeleconsultController {
  constructor(private readonly teleconsultService: TeleconsultService) {}

  @Post()
  async create(
    @Body() body: { patientId: number; facilityId: number; clinicianId?: number; notes?: string },
    @Request() req: any,
  ) {
    return this.teleconsultService.create({ ...body, actorUserId: Number(req.user.id) });
  }

  @Get()
  async findByFacility(@Query("facilityId") facilityId: string, @Query("status") status: string | undefined, @Request() req: any) {
    return this.teleconsultService.findByFacility(Number(facilityId), Number(req.user.id), status);
  }

  @Get("patient/:patientId")
  async findByPatient(@Param("patientId") patientId: string, @Request() req: any) {
    return this.teleconsultService.findByPatient(Number(patientId), Number(req.user.id));
  }

  @Get("active/:facilityId")
  async getActive(@Param("facilityId") facilityId: string, @Request() req: any) {
    return this.teleconsultService.getActiveSessions(Number(facilityId), Number(req.user.id));
  }

  @Get(":id")
  async findOne(@Param("id") id: string, @Request() req: any) {
    return this.teleconsultService.findById(Number(id), Number(req.user.id));
  }

  @Post(":id/start")
  async start(@Param("id") id: string, @Body() body: { clinicianId: number }, @Request() req: any) {
    return this.teleconsultService.startSession(Number(id), body.clinicianId, Number(req.user.id));
  }

  @Post(":id/end")
  async end(@Param("id") id: string, @Body() body: { notes?: string }, @Request() req: any) {
    return this.teleconsultService.endSession(Number(id), Number(req.user.id), body.notes);
  }

  @Post(":id/cancel")
  async cancel(@Param("id") id: string, @Request() req: any) {
    return this.teleconsultService.cancelSession(Number(id), Number(req.user.id));
  }
}
