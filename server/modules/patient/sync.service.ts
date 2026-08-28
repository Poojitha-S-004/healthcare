import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { SyncOperation } from "../../database/entities";

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(
    @InjectRepository(SyncOperation)
    private readonly syncRepo: Repository<SyncOperation>,
  ) {}

  async pushOperations(data: {
    userId: number;
    facilityId?: number;
    operations: Array<{
      id: string;
      type: string;
      entityId: string;
      createdAt: number;
      payload?: string;
    }>;
  }): Promise<{ acknowledgedIds: string[]; acknowledgedAt: number }> {
    const acknowledgedIds: string[] = [];

    for (const op of data.operations) {
      try {
        const existing = await this.syncRepo.findOne({
          where: { operationId: op.id },
        });

        if (existing) {
          acknowledgedIds.push(op.id);
          continue;
        }

        const operation = this.syncRepo.create({
          operationId: op.id,
          userId: data.userId,
          facilityId: data.facilityId ?? null,
          operationType: op.type,
          entityId: op.entityId,
          payload: op.payload ?? null,
          clientCreatedAt: new Date(op.createdAt),
        });

        await this.syncRepo.save(operation);
        acknowledgedIds.push(op.id);
      } catch (error) {
        this.logger.error(`Failed to record sync operation ${op.id}:`, error);
      }
    }

    return { acknowledgedIds, acknowledgedAt: Date.now() };
  }

  async getOperationsSince(facilityId: number, since: Date): Promise<SyncOperation[]> {
    return this.syncRepo.find({
      where: {
        facilityId,
        clientCreatedAt: { $gt: since } as any,
      },
      order: { clientCreatedAt: "ASC" },
      take: 500,
    });
  }
}
