import "dotenv/config";
import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import express from "express";
import { AppModule } from "./app.module";
import { appRouter } from "./routers";
import { createContext } from "./_core/context";
import { securityMiddleware } from "./security/security.middleware";

async function bootstrap() {
  if (process.env.NODE_ENV === "production" && (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32)) {
    throw new Error("JWT_SECRET must be set to a random value of at least 32 characters in production");
  }

  const app = await NestFactory.create(AppModule, { bodyParser: true });
  app.set("trust proxy", 1);
  app.use(express.json({ limit: "250kb" }));
  app.use(express.urlencoded({ extended: false, limit: "100kb" }));
  app.use(securityMiddleware);

  // Reflect the request origin so credentialed (cookie-based) cross-origin
  // calls from the Expo web app (e.g. http://localhost:8081) work against this
  // API on :3000. "Access-Control-Allow-Origin: *" is rejected by browsers
  // when credentials are included.
  const corsOrigin = process.env.CORS_ORIGIN;
  if (process.env.NODE_ENV === "production" && (!corsOrigin || corsOrigin === "*")) {
    throw new Error("CORS_ORIGIN must explicitly list trusted frontend origins in production");
  }
  app.enableCors({
    origin:
      corsOrigin
        ? corsOrigin.split(",").map((origin) => origin.trim())
        : true,
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
