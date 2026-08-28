import "dotenv/config";
import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { AppModule } from "./app.module";
import { appRouter } from "./routers";
import { createContext } from "./_core/context";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Reflect the request origin so credentialed (cookie-based) cross-origin
  // calls from the Expo web app (e.g. http://localhost:8081) work against this
  // API on :3000. "Access-Control-Allow-Origin: *" is rejected by browsers
  // when credentials are included.
  const corsOrigin = process.env.CORS_ORIGIN;
  app.enableCors({
    origin:
      corsOrigin && corsOrigin !== "*"
        ? corsOrigin.split(",").map((origin) => origin.trim())
        : (origin: string | undefined, callback: (err: Error | null, allow?: unknown) => void) =>
            callback(null, origin),
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = parseInt(process.env.PORT ?? "3000", 10);

  // Serve tRPC (used by the app's offline sync) on the same API server.
  // The broker reads the session from the "app_session_id" cookie (web) or a
  // Bearer token (native), so protected procedures work with cookie-based auth.
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    }),
  );

  await app.listen(port);

  const hasRedis = !!(process.env.REDIS_URL && (() => {
    try {
      const url = new URL(process.env.REDIS_URL!);
      const port = parseInt(url.port || "6379", 10);
      const host = url.hostname || "localhost";
      require("child_process").execSync(
        `node -e "require('net').createConnection(${port},'${host}').on('connect',()=>process.exit(0)).on('error',()=>process.exit(1))"`,
        { timeout: 2000, stdio: "pipe" },
      );
      return true;
    } catch { return false; }
  })());

  const dbStatus = process.env.DATABASE_URL ? "PostgreSQL" : "none (no DATABASE_URL)";
  const redisStatus = hasRedis ? "Redis" : "in-memory cache";
  const queueStatus = hasRedis ? "Bull queues active" : "queues disabled (no Redis)";

  console.log("");
  console.log(`  [NestJS] Server listening on http://localhost:${port}`);
  console.log(`  Database:    ${dbStatus}`);
  console.log(`  Cache:       ${redisStatus}`);
  console.log(`  Queues:      ${queueStatus}`);
  console.log(`  Health:      http://localhost:${port}/api/health`);
  console.log("");
}

bootstrap();
