import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { TeleconsultSession } from "../../database/entities/teleconsult-session.entity";
import { User } from "../../database/entities/user.entity";
import { TeleconsultMessage } from "./teleconsult-message.entity";
import { TeleconsultService } from "./teleconsult.service";
import { TeleconsultController } from "./teleconsult.controller";
import { TeleconsultMessageController } from "./teleconsult-message.controller";
import { TeleconsultMessageService } from "./teleconsult-message.service";
import { SecurityModule } from "../../security/security.module";

@Module({
  imports: [TypeOrmModule.forFeature([TeleconsultSession, TeleconsultMessage, User]), SecurityModule],
  providers: [TeleconsultService, TeleconsultMessageService],
  controllers: [TeleconsultController, TeleconsultMessageController],
  exports: [TeleconsultService],
})
export class TeleconsultModule {}
