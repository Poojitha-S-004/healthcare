import { Controller, Post, Body, Get, UseGuards, Request, Logger, UnauthorizedException } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { JwtAuthGuard } from "./jwt-auth.guard";

@Controller("api/auth")
export class AuthController {
  private readonly logger = new Logger(AuthController.name);
  constructor(private readonly authService: AuthService) {
    this.logger.log(`AuthService injected: ${!!authService}`);
  }

  @Post("login")
  async login(@Body() body: { openId?: string }) {
    if (!body?.openId) throw new UnauthorizedException("openId is required");
    return this.authService.login(body.openId);
  }

  @UseGuards(JwtAuthGuard)
  @Get("me")
  async me(@Request() req: any) {
    return this.authService.getProfile(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post("logout")
  async logout() {
    return { success: true };
  }
}
