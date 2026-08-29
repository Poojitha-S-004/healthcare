import { SetMetadata } from "@nestjs/common";

export const ROLES_KEY = "roles";
export type StaffRole =
  | "registration"
  | "nurse"
  | "clinician"
  | "pharmacy"
  | "referral"
  | "manager"
  | "supervisor";

export const Roles = (...roles: StaffRole[]) => SetMetadata(ROLES_KEY, roles);
