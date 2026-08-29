import { Controller, Post, Body, Get, UseGuards } from "@nestjs/common";
import { HealthIdService } from "./health-id.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";

@Controller("api/health-id")
export class HealthIdController {
  constructor(private readonly healthIdService: HealthIdService) {}

  @Get("status")
  getStatus() {
    return {
      configured: this.healthIdService.isConfigured(),
      provider: "ABDM",
    };
  }

  @Post("initiate")
  async initiate(@Body() body: { healthId: string }) {
    return this.healthIdService.initiateAbha(body.healthId);
  }

  @Post("verify")
  async verify(@Body() body: { txnId: string; otp: string }) {
    return this.healthIdService.verifyOtp(body.txnId, body.otp);
  }

  @UseGuards(JwtAuthGuard)
  @Get("profile")
  async getProfile(@Body() body: { accessToken: string }) {
    return this.healthIdService.getAbhaProfile(body.accessToken);
  }
}
