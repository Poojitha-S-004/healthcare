import { Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import axios from "axios";
import { User } from "../../database/entities";
import { ABDM_DEFAULT_CONFIG, AbdmConfig } from "./abdm.types";

@Injectable()
export class HealthIdService {
  private readonly logger = new Logger(HealthIdService.name);
  private readonly config: AbdmConfig;
  private gatewayToken: string | null = null;
  private gatewayTokenExpiry = 0;

  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly jwtService: JwtService,
  ) {
    this.config = {
      clientId: process.env.ABDM_CLIENT_ID || ABDM_DEFAULT_CONFIG.clientId,
      clientSecret: process.env.ABDM_CLIENT_SECRET || ABDM_DEFAULT_CONFIG.clientSecret,
      gatewayUrl: process.env.ABDM_GATEWAY_URL || ABDM_DEFAULT_CONFIG.gatewayUrl,
      abdmApiUrl: process.env.ABDM_API_URL || ABDM_DEFAULT_CONFIG.abdmApiUrl,
    };
  }

  private async getGatewayToken(): Promise<string> {
    if (this.gatewayToken && Date.now() < this.gatewayTokenExpiry) {
      return this.gatewayToken;
    }

    if (!this.config.clientId || !this.config.clientSecret) {
      throw new UnauthorizedException("ABDM credentials not configured. Set ABDM_CLIENT_ID and ABDM_CLIENT_SECRET.");
    }

    try {
      const response = await axios.post(
        `${this.config.gatewayUrl}/v0.5/sessions`,
        {
          clientId: this.config.clientId,
          clientSecret: this.config.clientSecret,
        },
      );

      this.gatewayToken = response.data.token;
      this.gatewayTokenExpiry = Date.now() + (response.data.expiresIn - 60) * 1000;
      return this.gatewayToken!;
    } catch (error) {
      this.logger.error("Failed to get ABDM gateway token", error);
      throw new UnauthorizedException("Failed to authenticate with ABDM gateway");
    }
  }

  async initiateAbha(healthId: string): Promise<{ txnId: string; authMethod: string }> {
    const token = await this.getGatewayToken();

    try {
      const response = await axios.post(
        `${this.config.abdmApiUrl}/enrollment/auth/byAbdm`,
        { healthId },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      return {
        txnId: response.data.txnId,
        authMethod: response.data.authMethod ?? "otp",
      };
    } catch (error) {
      this.logger.error("Failed to initiate ABHA authentication", error);
      throw new UnauthorizedException("Failed to initiate ABHA authentication");
    }
  }

  async verifyOtp(txnId: string, otp: string): Promise<{
    accessToken: string;
    abhaNumber: string;
    abhaAddress: string;
    profile: {
      name: string;
      gender: string;
      dateOfBirth: string;
      phone: string;
    };
  }> {
    const token = await this.getGatewayToken();

    try {
      const response = await axios.post(
        `${this.config.abdmApiUrl}/enrollment/auth/verifyOtp`,
        { txnId, otp },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      const abhaToken = response.data.token;
      const refreshToken = response.data.refreshToken;

      const profileResponse = await axios.get(
        `${this.config.abdmApiUrl}/profile/getProfile`,
        { headers: { Authorization: `Bearer ${abhaToken}` } },
      );

      const profile = profileResponse.data;

      let user = await this.userRepo.findOne({
        where: { openId: profile.abhaNumber },
      });

      if (!user) {
        user = this.userRepo.create({
          openId: profile.abhaNumber,
          name: profile.name || null,
          loginMethod: "abdm",
        });
        user = await this.userRepo.save(user);
      } else {
        user.name = profile.name || user.name;
        user.loginMethod = "abdm";
        user.lastSignedIn = new Date();
        await this.userRepo.save(user);
      }

      const accessToken = this.jwtService.sign({
        sub: user.id,
        openId: user.openId,
        role: user.role,
        authMethod: "abdm",
      });

      return {
        accessToken,
        abhaNumber: profile.abhaNumber,
        abhaAddress: profile.abhaAddress || profile.abhaNumber,
        profile: {
          name: profile.name,
          gender: profile.gender,
          dateOfBirth: profile.dateOfBirth,
          phone: profile.phone,
        },
      };
    } catch (error) {
      this.logger.error("Failed to verify ABHA OTP", error);
      throw new UnauthorizedException("Invalid OTP or ABHA authentication failed");
    }
  }

  async getAbhaProfile(accessToken: string): Promise<any> {
    try {
      const response = await axios.get(
        `${this.config.abdmApiUrl}/profile/getProfile`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      return response.data;
    } catch (error) {
      this.logger.error("Failed to fetch ABHA profile", error);
      throw new UnauthorizedException("Failed to fetch ABHA profile");
    }
  }

  isConfigured(): boolean {
    return !!(this.config.clientId && this.config.clientSecret);
  }
}
