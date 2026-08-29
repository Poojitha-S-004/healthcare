import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { AuditLog } from "./audit-log.entity";
import { AuditInterceptor } from "./audit.interceptor";
import { AuditController } from "./audit.controller";
import { SecurityModule } from "../security/security.module";

@Module({
  imports: [TypeOrmModule.forFeature([AuditLog]), SecurityModule],
  controllers: [AuditController],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
})
export class AuditModule {}
