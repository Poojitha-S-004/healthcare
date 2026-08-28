import { Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User } from "../../database/entities";

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly jwtService: JwtService,
  ) {
    this.logger.log(`AuthService constructed, userRepo: ${!!userRepo}`);
  }

  async validateUser(openId: string): Promise<User> {
    let user = await this.userRepo.findOne({ where: { openId } });
    if (!user) {
      user = this.userRepo.create({ openId });
      user = await this.userRepo.save(user);
    }
    user.lastSignedIn = new Date();
    await this.userRepo.save(user);
    return user;
  }

  async login(openId: string): Promise<{ accessToken: string; user: User }> {
    const user = await this.validateUser(openId);
    const payload = {
      sub: user.id,
      openId: user.openId,
      role: user.role,
      // Extra claims so the same token also works as an SDK session token:
      // sdk.verifySession (used by tRPC/sync.push via cookie or Bearer)
      // requires non-empty openId/appId/name.
      appId: process.env.VITE_APP_ID || "local-app",
      name: user.name || user.openId,
    };
    const accessToken = this.jwtService.sign(payload);
    return { accessToken, user };
  }

  async validateTokenPayload(payload: { sub: number; openId: string }): Promise<User> {
    const user = await this.userRepo.findOne({ where: { id: payload.sub } });
    if (!user) {
      throw new UnauthorizedException("User not found");
    }
    return user;
  }

  async getProfile(userId: number): Promise<User | null> {
    return this.userRepo.findOne({ where: { id: userId } });
  }

  async updateRole(userId: number, role: "user" | "admin"): Promise<User> {
    await this.userRepo.update(userId, { role });
    return this.userRepo.findOne({ where: { id: userId } }) as Promise<User>;
  }
}
