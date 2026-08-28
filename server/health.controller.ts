import { Controller, Get } from "@nestjs/common";

@Controller("api")
export class HealthController {
  @Get("health")
  health() {
    return {
      ok: true,
      timestamp: Date.now(),
      framework: "NestJS",
      database: "PostgreSQL",
      cache: "Redis",
    };
  }
}
