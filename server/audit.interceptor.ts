import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Observable, tap, catchError, throwError } from "rxjs";
import { Repository } from "typeorm";
import { AuditLog } from "./audit-log.entity";

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepo: Repository<AuditLog>,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const req = http.getRequest<any>();
    const res = http.getResponse<any>();
    const startedAt = Date.now();

    const write = async (success: boolean, statusCode: number) => {
      try {
        const audit = this.auditRepo.create({
          actorUserId: req.user?.id ? Number(req.user.id) : null,
          facilityId: this.resolveFacilityId(req),
          action: `${req.method} ${req.route?.path ?? req.path}`.slice(0, 64),
          resource: this.resourceFromPath(req.path),
          resourceId: this.resourceIdFromParams(req.params),
          method: req.method,
          path: String(req.path).slice(0, 512),
          statusCode,
          success,
          ipAddress: this.ip(req),
          userAgent: typeof req.headers?.["user-agent"] === "string"
            ? req.headers["user-agent"].slice(0, 256)
            : null,
          metadata: {
            durationMs: Date.now() - startedAt,
          },
        });
        await this.auditRepo.save(audit);
      } catch (error) {
        // Audit failure must not break clinical requests, but it should be visible operationally.
        this.logger.error(`Failed to persist audit log: ${error instanceof Error ? error.message : String(error)}`);
      }
    };

    return next.handle().pipe(
      tap(() => void write(true, res.statusCode)),
      catchError((error) => {
        const status = Number(error?.status ?? 500);
        void write(false, status);
        return throwError(() => error);
      }),
    );
  }

  private resolveFacilityId(req: any): number | null {
    const raw = req.params?.facilityId ?? req.query?.facilityId ?? req.body?.facilityId;
    const value = Number(raw);
    return Number.isInteger(value) && value > 0 ? value : null;
  }

  private resourceFromPath(path: string): string {
    const segment = String(path).split("/").filter(Boolean)[1] || "unknown";
    return segment.slice(0, 64);
  }

  private resourceIdFromParams(params: Record<string, unknown>): string | null {
    const candidate = params?.id ?? params?.patientId ?? params?.sessionId ?? params?.facilityId;
    return candidate == null ? null : String(candidate).slice(0, 128);
  }

  private ip(req: any): string | null {
    const forwarded = req.headers?.["x-forwarded-for"];
    const value = typeof forwarded === "string" ? forwarded.split(",")[0].trim() : req.ip;
    return value ? String(value).slice(0, 64) : null;
  }
}
