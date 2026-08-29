import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Patient } from "../../database/entities";
import { CacheService } from "../../redis/cache.service";

@Injectable()
export class PatientService {
  private readonly CACHE_TTL = 300;

  constructor(
    @InjectRepository(Patient)
    private readonly patientRepo: Repository<Patient>,
    private readonly cache: CacheService,
  ) {}

  async findById(id: number): Promise<Patient | null> {
    const cacheKey = `patient:${id}`;
    const cached = await this.cache.get<Patient>(cacheKey);
    if (cached) return cached;

    const patient = await this.patientRepo.findOne({
      where: { id },
      relations: ["facility"],
    });
    if (patient) {
      await this.cache.set(cacheKey, patient, this.CACHE_TTL);
    }
    return patient;
  }

  async findByFacility(facilityId: number, filters?: { careCategory?: string; search?: string }): Promise<Patient[]> {
    const qb = this.patientRepo.createQueryBuilder("patient")
      .where("patient.facilityId = :facilityId", { facilityId });

    if (filters?.careCategory) {
      qb.andWhere("patient.careCategory = :careCategory", { careCategory: filters.careCategory });
    }
    if (filters?.search) {
      qb.andWhere("(patient.name ILIKE :search OR patient.localId ILIKE :search)", {
        search: `%${filters.search}%`,
      });
    }

    return qb.orderBy("patient.registeredAt", "DESC").getMany();
  }

  async create(data: {
    localId: string;
    name: string;
    facilityId: number;
    dateOfBirth?: string;
    gender?: string;
    guardianName?: string;
    contactPhone?: string;
    careCategory?: "emergency" | "urgent" | "priority" | "routine";
    allergies?: string;
    currentMedicines?: string;
  }): Promise<Patient> {
    const patient = this.patientRepo.create(data);
    const saved = await this.patientRepo.save(patient);
    await this.cache.del(`facility:${data.facilityId}:patients`);
    return saved;
  }

  async update(id: number, data: Partial<Patient>): Promise<Patient | null> {
    await this.patientRepo.update(id, data);
    await this.cache.del(`patient:${id}`);
    return this.findById(id);
  }
}
