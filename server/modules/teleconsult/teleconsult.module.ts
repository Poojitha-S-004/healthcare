import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { TeleconsultSession } from "../../database/entities";
import { TeleconsultService } from "./teleconsult.service";
import { TeleconsultController } from "./teleconsult.controller";

@Module({
  imports: [TypeOrmModule.forFeature([TeleconsultSession])],
  providers: [TeleconsultService],
  controllers: [TeleconsultController],
  exports: [TeleconsultService],
})
export class TeleconsultModule {}
