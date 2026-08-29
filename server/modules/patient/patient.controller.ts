import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
} from "@nestjs/common";
import { PatientService } from "./patient.service";
import { SyncService } from "./sync.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";

@Controller("api/patients")
export class PatientController {
  constructor(
    private readonly patientService: PatientService,
    private readonly syncService: SyncService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async findAll(
    @Query("facilityId") facilityId: string,
    @Query("careCategory") careCategory?: string,
    @Query("search") search?: string,
  ) {
    return this.patientService.findByFacility(Number(facilityId), { careCategory, search });
  }

  @UseGuards(JwtAuthGuard)
  @Get(":id")
  async findOne(@Param("id") id: number) {
    return this.patientService.findById(Number(id));
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Body() body: any) {
    return this.patientService.create(body);
  }

  @UseGuards(JwtAuthGuard)
  @Put(":id")
  async update(@Param("id") id: number, @Body() body: any) {
    return this.patientService.update(Number(id), body);
  }
}

@Controller("api/sync")
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @UseGuards(JwtAuthGuard)
  @Post("push")
  async push(
    @Request() req: any,
    @Body()
    body: {
      facilityId?: number;
      operations: Array<{
        id: string;
        type: string;
        entityId: string;
        createdAt: number;
        payload?: string;
      }>;
    },
  ) {
    return this.syncService.pushOperations({
      userId: req.user.id,
      facilityId: body.facilityId,
      operations: body.operations,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get("pull")
  async pull(
    @Query("facilityId") facilityId: string,
    @Query("since") since: string,
  ) {
    return this.syncService.getOperationsSince(
      Number(facilityId),
      new Date(since),
    );
  }
}
