export interface AbdmConfig {
  clientId: string;
  clientSecret: string;
  gatewayUrl: string;
  abdmApiUrl: string;
}

export const ABDM_DEFAULT_CONFIG: AbdmConfig = {
  clientId: process.env.ABDM_CLIENT_ID ?? "",
  clientSecret: process.env.ABDM_CLIENT_SECRET ?? "",
  gatewayUrl: process.env.ABDM_GATEWAY_URL ?? "https://abhasbx.abdm.gov.in",
  abdmApiUrl: process.env.ABDM_API_URL ?? "https://abhasbx.abdm.gov.in/abha/api/v3",
};

export interface AbhaInitRequest {
  healthId?: string;
  aadhaar?: string;
  mobile?: string;
}

export interface AbhaInitResponse {
  txnId: string;
  authMethod: string;
}

export interface AbhaOtpVerifyRequest {
  txnId: string;
  otp: string;
}

export interface AbhaOtpVerifyResponse {
  token: string;
  refreshToken: string;
  expiresIn: number;
  abhaNumber?: string;
  abhaAddress?: string;
  name?: string;
  gender?: string;
  dateOfBirth?: string;
  phone?: string;
  email?: string;
  state?: string;
  district?: string;
  pincode?: string;
}

export interface AbhaProfileResponse {
  abhaNumber: string;
  abhaAddress: string;
  name: string;
  gender: string;
  dateOfBirth: string;
  phone: string;
  email?: string;
  state?: string;
  district?: string;
  pincode?: string;
}

export interface AbdmTokenResponse {
  accessToken: string;
  expiresIn: number;
  tokenType: string;
}
