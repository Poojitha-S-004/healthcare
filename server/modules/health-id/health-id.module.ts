import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { JwtModule } from "@nestjs/jwt";
import { User } from "../../database/entities";
import { HealthIdService } from "./health-id.service";
import { HealthIdController } from "./health-id.controller";

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? "dev-secret-change-in-production",
      signOptions: { expiresIn: "365d" },
    }),
  ],
  providers: [HealthIdService],
  controllers: [HealthIdController],
  exports: [HealthIdService],
})
export class HealthIdModule {}
