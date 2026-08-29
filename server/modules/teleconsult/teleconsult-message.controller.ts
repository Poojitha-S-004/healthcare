import { Body, Controller, Get, Param, Post, Query, Request, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { TeleconsultMessageService } from "./teleconsult-message.service";

@Controller("api/teleconsult")
@UseGuards(JwtAuthGuard)
export class TeleconsultMessageController {
  constructor(private readonly messages: TeleconsultMessageService) {}

  @Get(":id/messages")
  async list(@Param("id") id: string, @Query("afterId") afterId: string | undefined, @Request() req: any) {
    return this.messages.list(Number(id), Number(req.user.id), afterId ? Number(afterId) : undefined);
  }

  @Post(":id/messages")
  async send(@Param("id") id: string, @Body() body: { content?: string }, @Request() req: any) {
    return this.messages.send(Number(id), Number(req.user.id), body);
  }
}
