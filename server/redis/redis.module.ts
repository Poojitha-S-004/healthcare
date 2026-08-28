import { Module, Global } from "@nestjs/common";
import { execSync } from "child_process";
import { REDIS_CLIENT } from "./redis.constants";
import { CacheService } from "./cache.service";

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

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: async () => {
        if (!hasRedis) {
          if (process.env.REDIS_URL) {
            console.log("[Redis] REDIS_URL is set but Redis is not reachable, using in-memory cache");
          } else {
            console.log("[Redis] No REDIS_URL set, using in-memory cache");
          }
          return null;
        }
        const { default: Redis } = await import("ioredis");
        const client = new Redis(process.env.REDIS_URL!, {
          maxRetriesPerRequest: 3,
          retryStrategy(times) {
            const delay = Math.min(times * 200, 2000);
            return delay;
          },
        });
        client.on("error", (err) => {
          console.error("[Redis] Connection error:", err.message);
        });
        client.on("connect", () => {
          console.log("[Redis] Connected");
        });
        return client;
      },
    },
    CacheService,
  ],
  exports: [REDIS_CLIENT, CacheService],
})
export class RedisModule {}
