import type {
  TriagePriority,
  TriagePriorityReason,
  TriageFlagInput,
} from "@/shared/triage";

export type AppLanguage = "en" | "hi";

export type SyncState = "synced" | "pending" | "conflict";
export type Priority = TriagePriority;
export type PriorityReason = TriagePriorityReason;
export type CareTag = "maternal" | "child" | "chronic" | "general";
export type QueueStatus = "waiting" | "called" | "consulting" | "pharmacy" | "completed" | "paused";
export type ReferralStatus =
  | "draft"
  | "sent"
  | "accepted"
  | "awaitingTransport"
  | "inTransit"
  | "arrived"
  | "completed"
  | "followUpOverdue";
export type InventoryTransactionType = "receipt" | "dispense" | "adjustment" | "wastage" | "expiry";

export type Patient = {
  id: string;
  localId: string;
  name: string;
  age: number;
  sex: "female" | "male" | "other";
  contact?: string;
  careTags: CareTag[];
  allergies: string[];
  currentMedicines: string[];
  syncState: SyncState;
  updatedAt: number;
};

export type QueueEntry = {
  id: string;
  patientId: string;
  service: string;
  arrivedAt: number;
  priority: Priority;
  priorityReason: PriorityReason;
  status: QueueStatus;
  overrideReason?: string;
  syncState: SyncState;
};

export type Encounter = {
  id: string;
  patientId: string;
  type: "triage" | "consultation" | "followUp";
  note: string;
  createdAt: number;
  syncState: SyncState;
};

export type Referral = {
  id: string;
  patientId: string;
  destination: string;
  reason: string;
  urgency: Priority;
  status: ReferralStatus;
  createdAt: number;
  updatedAt: number;
  syncState: SyncState;
};

export type Medicine = {
  id: string;
  name: string;
  localName: string;
  unit: string;
  stock: number;
  minimumStock: number;
  expiryDays: number;
  lastSyncedAt: number;
  syncState: SyncState;
};

export type InventoryTransaction = {
  id: string;
  medicineId: string;
  type: InventoryTransactionType;
  quantity: number;
  createdAt: number;
  syncState: SyncState;
};

export type OfflineOperation = {
  id: string;
  type: string;
  entityId: string;
  createdAt: number;
};

export type PriorityInput = TriageFlagInput;

export type HealthState = {
  language: AppLanguage;
  patients: Patient[];
  queue: QueueEntry[];
  encounters: Encounter[];
  referrals: Referral[];
  medicines: Medicine[];
  inventoryTransactions: InventoryTransaction[];
  operations: OfflineOperation[];
  lastSyncedAt: number;
};
