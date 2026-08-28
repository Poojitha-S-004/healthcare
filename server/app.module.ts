import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";
import { BullModule } from "@nestjs/bull";
import { TypeOrmModule } from "@nestjs/typeorm";
import { execSync } from "child_process";
import { DatabaseModule } from "./database/database.module";
import { RedisModule } from "./redis/redis.module";
import { QueueModule } from "./queue/queue.module";
import { AuthModule } from "./modules/auth/auth.module";
import { FacilityModule } from "./modules/facility/facility.module";
import { PatientModule } from "./modules/patient/patient.module";
import { TeleconsultModule } from "./modules/teleconsult/teleconsult.module";
import { FhirModule } from "./modules/fhir/fhir.module";
import { HealthIdModule } from "./modules/health-id/health-id.module";
import {
  QueueController,
  TriageController,
} from "./modules/queue.controller";
import { HealthController } from "./health.controller";
import { TriageResult } from "./database/entities";

function isRedisReachable(): boolean {
  if (!process.env.REDIS_URL) return false;
  try {
    const url = new URL(process.env.REDIS_URL);
    const port = parseInt(url.port || "6379", 10);
    const host = url.hostname || "localhost";
    execSync(
      `node -e "require('net').createConnection(${port},'${host}').on('connect',()=>process.exit(0)).on('error',()=>process.exit(1))"`,
      { timeout: 2000, stdio: "pipe" },
    );
    return true;
  } catch {
    return false;
  }
}

const hasRedis = isRedisReachable();
const hasDb = !!process.env.DATABASE_URL;

if (process.env.REDIS_URL && !hasRedis) {
  console.log("[Startup] REDIS_URL is set but Redis is not reachable — running without Bull queues");
}

function parseRedisUrl(url: string) {
  try {
    const parsed = new URL(url);
    return { host: parsed.hostname, port: parseInt(parsed.port || "6379", 10) };
  } catch {
    return { host: "localhost", port: 6379 };
  }
}

const redisConfig = hasRedis ? parseRedisUrl(process.env.REDIS_URL!) : null;

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    DatabaseModule,
    RedisModule,
    ...(hasDb ? [TypeOrmModule.forFeature([TriageResult])] : []),
    ...(hasRedis ? [BullModule.forRoot({ redis: redisConfig! }), QueueModule] : []),
    ...(hasDb ? [AuthModule, FacilityModule, PatientModule, TeleconsultModule, FhirModule, HealthIdModule] : []),
  ],
  controllers: [
    HealthController,
    ...(hasRedis ? [QueueController, TriageController] : []),
  ],
})
export class AppModule {}
