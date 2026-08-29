import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Facility, FacilityMembership } from "../../database/entities";
import { CacheService } from "../../redis/cache.service";

@Injectable()
export class FacilityService {
  private readonly CACHE_TTL = 600;

  constructor(
    @InjectRepository(Facility)
    private readonly facilityRepo: Repository<Facility>,
    @InjectRepository(FacilityMembership)
    private readonly membershipRepo: Repository<FacilityMembership>,
    private readonly cache: CacheService,
  ) {}

  async findById(id: number): Promise<Facility | null> {
    const cacheKey = `facility:${id}`;
    const cached = await this.cache.get<Facility>(cacheKey);
    if (cached) return cached;

    const facility = await this.facilityRepo.findOne({
      where: { id },
      relations: ["facilityMemberships"],
    });
    if (facility) {
      await this.cache.set(cacheKey, facility, this.CACHE_TTL);
    }
    return facility;
  }

  async findByCode(code: string): Promise<Facility | null> {
    const cacheKey = `facility:code:${code}`;
    const cached = await this.cache.get<Facility>(cacheKey);
    if (cached) return cached;

    const facility = await this.facilityRepo.findOne({ where: { code } });
    if (facility) {
      await this.cache.set(cacheKey, facility, this.CACHE_TTL);
    }
    return facility;
  }

  async create(data: { code: string; name: string; defaultLanguage?: "en" | "hi" }): Promise<Facility> {
    const facility = this.facilityRepo.create(data);
    const saved = await this.facilityRepo.save(facility);
    await this.cache.del("facilities:list");
    return saved;
  }

  async addMember(data: { userId: number; facilityId: number; staffRole: string }): Promise<FacilityMembership> {
    const existing = await this.membershipRepo.findOne({
      where: {
        userId: data.userId,
        facilityId: data.facilityId,
        staffRole: data.staffRole as any,
      },
    });
    if (existing) return existing;

    const membership = this.membershipRepo.create(data as any);
    const result = await this.membershipRepo.save(membership);
    await this.cache.del(`facility:${data.facilityId}`);
    return Array.isArray(result) ? result[0] : result;
  }

  async getMembers(facilityId: number): Promise<FacilityMembership[]> {
    const cacheKey = `facility:${facilityId}:members`;
    const cached = await this.cache.get<FacilityMembership[]>(cacheKey);
    if (cached) return cached;

    const members = await this.membershipRepo.find({
      where: { facilityId },
      relations: ["user"],
    });
    const result = Array.isArray(members) ? members : [members];
    await this.cache.set(cacheKey, result, this.CACHE_TTL);
    return result;
  }
}
